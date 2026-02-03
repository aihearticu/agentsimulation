//! AgentSimulation Task Escrow Program
//! 
//! Handles USDC bounty escrow for agent task marketplace.
//! Based on Anchor Non-Custodial Escrow pattern.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AgntSim1111111111111111111111111111111111111");

#[program]
pub mod agent_escrow {
    use super::*;

    /// Create a new task with USDC bounty
    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: [u8; 32],
        bounty_amount: u64,
        task_hash: [u8; 32],  // IPFS hash of full task details
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        escrow.authority = ctx.accounts.authority.key();
        escrow.task_id = task_id;
        escrow.bounty_amount = bounty_amount;
        escrow.task_hash = task_hash;
        escrow.status = TaskStatus::Open;
        escrow.assigned_agent = None;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;

        // Transfer USDC from poster to escrow vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.poster_token_account.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, bounty_amount)?;

        emit!(TaskCreated {
            task_id,
            authority: ctx.accounts.authority.key(),
            bounty_amount,
            task_hash,
        });

        Ok(())
    }

    /// Agent claims a task
    pub fn claim_task(ctx: Context<ClaimTask>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(escrow.status == TaskStatus::Open, EscrowError::TaskNotOpen);
        
        escrow.status = TaskStatus::Claimed;
        escrow.assigned_agent = Some(ctx.accounts.agent.key());
        escrow.claimed_at = Some(Clock::get()?.unix_timestamp);

        emit!(TaskClaimed {
            task_id: escrow.task_id,
            agent: ctx.accounts.agent.key(),
        });

        Ok(())
    }

    /// Agent submits work (stores hash proof on-chain)
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        work_hash: [u8; 32],  // IPFS hash of deliverables
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(escrow.status == TaskStatus::Claimed, EscrowError::TaskNotClaimed);
        require!(
            escrow.assigned_agent == Some(ctx.accounts.agent.key()),
            EscrowError::NotAssignedAgent
        );

        escrow.status = TaskStatus::Submitted;
        escrow.work_hash = Some(work_hash);
        escrow.submitted_at = Some(Clock::get()?.unix_timestamp);

        emit!(WorkSubmitted {
            task_id: escrow.task_id,
            agent: ctx.accounts.agent.key(),
            work_hash,
        });

        Ok(())
    }

    /// Poster approves work and releases payment
    pub fn approve_and_release(ctx: Context<ApproveAndRelease>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        
        require!(escrow.status == TaskStatus::Submitted, EscrowError::WorkNotSubmitted);

        // Calculate fee split
        let platform_fee = escrow.bounty_amount * PLATFORM_FEE_BPS / 10000;
        let agent_payment = escrow.bounty_amount - platform_fee;

        // Transfer to agent
        let seeds = &[
            b"escrow",
            escrow.task_id.as_ref(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.agent_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, agent_payment)?;

        // Transfer platform fee
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.platform_fee_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_ctx_fee = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_fee,
            signer,
        );
        token::transfer(cpi_ctx_fee, platform_fee)?;

        // Update escrow status
        let escrow = &mut ctx.accounts.escrow.to_account_info();
        // Mark as completed (account will be closed)

        emit!(TaskCompleted {
            task_id: ctx.accounts.escrow.task_id,
            agent: ctx.accounts.escrow.assigned_agent.unwrap(),
            bounty_amount: ctx.accounts.escrow.bounty_amount,
            platform_fee,
        });

        Ok(())
    }

    /// Cancel task (only if unclaimed, returns funds to poster)
    pub fn cancel_task(ctx: Context<CancelTask>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        
        require!(escrow.status == TaskStatus::Open, EscrowError::CannotCancel);

        // Return funds to poster
        let seeds = &[
            b"escrow",
            escrow.task_id.as_ref(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.poster_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, escrow.bounty_amount)?;

        emit!(TaskCancelled {
            task_id: escrow.task_id,
        });

        Ok(())
    }
}

// Platform fee: 3% (300 basis points)
pub const PLATFORM_FEE_BPS: u64 = 300;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    Open,
    Claimed,
    Submitted,
    Completed,
    Cancelled,
    Disputed,
}

#[account]
pub struct TaskEscrow {
    pub authority: Pubkey,           // Task poster
    pub task_id: [u8; 32],           // Unique task identifier
    pub bounty_amount: u64,          // USDC amount in escrow
    pub task_hash: [u8; 32],         // IPFS hash of task details
    pub status: TaskStatus,
    pub assigned_agent: Option<Pubkey>,
    pub work_hash: Option<[u8; 32]>, // IPFS hash of submitted work
    pub created_at: i64,
    pub claimed_at: Option<i64>,
    pub submitted_at: Option<i64>,
    pub bump: u8,
}

impl TaskEscrow {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // authority
        32 +                     // task_id
        8 +                      // bounty_amount
        32 +                     // task_hash
        1 +                      // status
        33 +                     // assigned_agent (Option<Pubkey>)
        33 +                     // work_hash (Option<[u8; 32]>)
        8 +                      // created_at
        9 +                      // claimed_at
        9 +                      // submitted_at
        1;                       // bump
}

#[account]
pub struct AgentReputation {
    pub wallet: Pubkey,
    pub tasks_completed: u64,
    pub tasks_failed: u64,
    pub total_earnings: u64,
    pub average_rating: u16,     // 0-10000 (100.00%)
    pub stake_amount: u64,       // Staked USDC for Sybil resistance
    pub registered_at: i64,
    pub bump: u8,
}

impl AgentReputation {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // wallet
        8 +                      // tasks_completed
        8 +                      // tasks_failed
        8 +                      // total_earnings
        2 +                      // average_rating
        8 +                      // stake_amount
        8 +                      // registered_at
        1;                       // bump
}

// === Context Structs ===

#[derive(Accounts)]
#[instruction(task_id: [u8; 32])]
pub struct CreateTask<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = TaskEscrow::LEN,
        seeds = [b"escrow", task_id.as_ref()],
        bump
    )]
    pub escrow: Account<'info, TaskEscrow>,
    
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = escrow,
        seeds = [b"vault", task_id.as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub poster_token_account: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimTask<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, TaskEscrow>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, TaskEscrow>,
}

#[derive(Accounts)]
pub struct ApproveAndRelease<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_ref()],
        bump = escrow.bump,
        has_one = authority
    )]
    pub escrow: Account<'info, TaskEscrow>,
    
    #[account(
        mut,
        seeds = [b"vault", escrow.task_id.as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub agent_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub platform_fee_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelTask<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_ref()],
        bump = escrow.bump,
        has_one = authority,
        close = authority
    )]
    pub escrow: Account<'info, TaskEscrow>,
    
    #[account(
        mut,
        seeds = [b"vault", escrow.task_id.as_ref()],
        bump,
        close = authority
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub poster_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

// === Events ===

#[event]
pub struct TaskCreated {
    pub task_id: [u8; 32],
    pub authority: Pubkey,
    pub bounty_amount: u64,
    pub task_hash: [u8; 32],
}

#[event]
pub struct TaskClaimed {
    pub task_id: [u8; 32],
    pub agent: Pubkey,
}

#[event]
pub struct WorkSubmitted {
    pub task_id: [u8; 32],
    pub agent: Pubkey,
    pub work_hash: [u8; 32],
}

#[event]
pub struct TaskCompleted {
    pub task_id: [u8; 32],
    pub agent: Pubkey,
    pub bounty_amount: u64,
    pub platform_fee: u64,
}

#[event]
pub struct TaskCancelled {
    pub task_id: [u8; 32],
}

// === Errors ===

#[error_code]
pub enum EscrowError {
    #[msg("Task is not open for claiming")]
    TaskNotOpen,
    #[msg("Task has not been claimed")]
    TaskNotClaimed,
    #[msg("You are not the assigned agent")]
    NotAssignedAgent,
    #[msg("Work has not been submitted")]
    WorkNotSubmitted,
    #[msg("Task cannot be cancelled in current state")]
    CannotCancel,
}
