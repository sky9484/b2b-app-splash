/// Splash settlement registry.
///
/// On every cross-border payout, after the MYR -> USDC swap on Luno settles,
/// the Splash backend records an immutable settlement event on Sui. This gives
/// every transfer a real, auditable on-chain receipt that links back to the
/// off-chain MYR/PHP transaction reference.
///
/// Privacy: we never publish recipient PII on chain. We hash (bank|account|name)
/// off-chain and store only the 32-byte digest.
module splash::settlement {
    use sui::event;
    use std::string::{Self, String};

    /// Shared object that aggregates lifetime settlement totals.
    public struct Registry has key {
        id: UID,
        total_settlements: u64,
        total_myr_minor: u64,
        total_php_minor: u64,
    }

    /// Emitted on every recorded settlement.
    public struct SettlementRecorded has copy, drop {
        registry_id: address,
        sequence: u64,
        ref_id: String,
        myr_minor: u64,
        php_minor: u64,
        rate_bp: u64, // MYR->PHP rate in basis points, scaled 1e4 (e.g. 12.9822 -> 129822)
        recipient_hash: vector<u8>,
    }

    /// Module init: publishes a single shared Registry object.
    fun init(ctx: &mut TxContext) {
        let reg = Registry {
            id: object::new(ctx),
            total_settlements: 0,
            total_myr_minor: 0,
            total_php_minor: 0,
        };
        transfer::share_object(reg);
    }

    /// Append a settlement record. Called server-side by the Splash backend
    /// after the off-chain MYR -> USDC leg confirms.
    public entry fun record_settlement(
        registry: &mut Registry,
        ref_id: vector<u8>,
        myr_minor: u64,
        php_minor: u64,
        rate_bp: u64,
        recipient_hash: vector<u8>,
        _ctx: &mut TxContext,
    ) {
        registry.total_settlements = registry.total_settlements + 1;
        registry.total_myr_minor = registry.total_myr_minor + myr_minor;
        registry.total_php_minor = registry.total_php_minor + php_minor;

        event::emit(SettlementRecorded {
            registry_id: object::id_address(registry),
            sequence: registry.total_settlements,
            ref_id: string::utf8(ref_id),
            myr_minor,
            php_minor,
            rate_bp,
            recipient_hash,
        });
    }

    // ---------- read-only views ----------
    public fun total_settlements(reg: &Registry): u64 { reg.total_settlements }
    public fun total_myr_minor(reg: &Registry): u64 { reg.total_myr_minor }
    public fun total_php_minor(reg: &Registry): u64 { reg.total_php_minor }
}
