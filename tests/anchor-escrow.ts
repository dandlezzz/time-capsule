import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { AnchorEscrow } from '../target/types/anchor_escrow';
import { PublicKey, SystemProgram, Transaction, Connection, Commitment } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { assert } from "chai";

describe('anchor-escrow', () => {
  const commitment: Commitment = 'processed';
  const connection = new Connection('http://localhost:8899', { commitment });
  const options = anchor.Provider.defaultOptions();
  const wallet = NodeWallet.local();
  const provider = new anchor.Provider(connection, wallet, options);

  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorEscrow as Program<AnchorEscrow>;

  let mintA = null as Token;
  let mintB = null as Token;
  let initializerTokenAccountA = null;
  let initializerTokenAccountB = null;
  let takerTokenAccountA = null;
  let takerTokenAccountB = null;
  let vault_account_pda = null;
  let vault_account_bump = null;
  let vault_authority_pda = null;

  const takerAmount = 1000;
  const initializerAmount = 500;

  const escrowAccount = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const initializerMainAccount = anchor.web3.Keypair.generate();
  const takerMainAccount = anchor.web3.Keypair.generate();

  it("Initialize program state", async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "processed"
    );
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(initializerMainAccount.publicKey, 10000000000),
      "processed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(takerMainAccount.publicKey, 10000000000),
      "processed"
    );


    mintA = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    mintB = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    initializerTokenAccountA = await mintA.createAccount(initializerMainAccount.publicKey);
    takerTokenAccountA = await mintA.createAccount(takerMainAccount.publicKey);

    initializerTokenAccountB = await mintB.createAccount(initializerMainAccount.publicKey);
    takerTokenAccountB = await mintB.createAccount(takerMainAccount.publicKey);

    await mintA.mintTo(
      initializerTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      initializerAmount
    );

    await mintB.mintTo(
      takerTokenAccountB,
      mintAuthority.publicKey,
      [mintAuthority],
      takerAmount
    );

    let _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
    let _takerTokenAccountB = await mintB.getAccountInfo(takerTokenAccountB);

    assert.ok(_initializerTokenAccountA.amount.toNumber() == initializerAmount);
    assert.ok(_takerTokenAccountB.amount.toNumber() == takerAmount);
  });

  it("Initialize escrow", async () => {
    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("token-seed"))],
      program.programId
    );
    vault_account_pda = _vault_account_pda;
    vault_account_bump = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    await program.rpc.initialize(
      vault_account_bump,
      new anchor.BN(initializerAmount),
      new anchor.BN(takerAmount),
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          vaultAccount: vault_account_pda,
          mint: mintA.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountB,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccount),
        ],
        signers: [escrowAccount, initializerMainAccount],
      }
    );

    let _vault = await mintA.getAccountInfo(vault_account_pda);

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccount.publicKey
    );

    // Check that the new owner is the PDA.
    assert.ok(_vault.owner.equals(vault_authority_pda));

    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(initializerMainAccount.publicKey));
    assert.ok(_escrowAccount.initializerAmount.toNumber() == initializerAmount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == takerAmount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(initializerTokenAccountA)
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(initializerTokenAccountB)
    );
  });


});
