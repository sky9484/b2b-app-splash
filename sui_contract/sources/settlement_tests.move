#[test_only]
module splash::settlement_tests {
    use sui::test_scenario::{Self as ts};
    use splash::settlement::{Self, Registry};

    // ── constants ─────────────────────────────────────────────────────────────
    const ADMIN: address = @0xAD;

    // ── helpers ───────────────────────────────────────────────────────────────

    /// Initialise the module and return a scenario with the Registry available.
    /// We call the public test-only init wrapper so the shared Registry exists.
    fun setup(): ts::Scenario {
        let mut scenario = ts::begin(ADMIN);
        // Trigger module init by calling the test_init helper
        {
            let ctx = ts::ctx(&mut scenario);
            settlement::test_init(ctx);
        };
        ts::next_tx(&mut scenario, ADMIN);
        scenario
    }

    // ── test: registry starts at zero ─────────────────────────────────────────
    #[test]
    fun test_registry_initial_state() {
        let mut scenario = setup();

        {
            let registry = ts::take_shared<Registry>(&scenario);
            assert!(settlement::total_settlements(&registry) == 0, 0);
            assert!(settlement::total_myr_minor(&registry) == 0, 1);
            assert!(settlement::total_php_minor(&registry) == 0, 2);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // ── test: single settlement increments all counters ───────────────────────
    #[test]
    fun test_record_single_settlement() {
        let mut scenario = setup();

        {
            let mut registry = ts::take_shared<Registry>(&scenario);
            let ctx = ts::ctx(&mut scenario);

            // RM 1,000.00 → PHP 12,982.20  |  rate 12.9822 → 129822 bp
            settlement::record_settlement(
                &mut registry,
                b"SPL260429001",
                100000,   // myr_minor  (RM 1,000.00 in sen)
                1298220,  // php_minor  (PHP 12,982.20 in centavos)
                129822,   // rate_bp
                x"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                ctx,
            );

            assert!(settlement::total_settlements(&registry) == 1, 0);
            assert!(settlement::total_myr_minor(&registry) == 100000, 1);
            assert!(settlement::total_php_minor(&registry) == 1298220, 2);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // ── test: multiple settlements accumulate correctly ───────────────────────
    #[test]
    fun test_record_multiple_settlements() {
        let mut scenario = setup();

        {
            let mut registry = ts::take_shared<Registry>(&scenario);
            let ctx = ts::ctx(&mut scenario);

            // Transfer 1: RM 500
            settlement::record_settlement(
                &mut registry,
                b"SPL260429002",
                50000,
                649110,
                129822,
                x"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                ctx,
            );

            // Transfer 2: RM 2,000
            settlement::record_settlement(
                &mut registry,
                b"SPL260429003",
                200000,
                2596440,
                129822,
                x"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                ctx,
            );

            assert!(settlement::total_settlements(&registry) == 2, 0);
            assert!(settlement::total_myr_minor(&registry) == 250000, 1);   // 50000 + 200000
            assert!(settlement::total_php_minor(&registry) == 3245550, 2);  // 649110 + 2596440

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // ── test: sequence counter increments per call ────────────────────────────
    #[test]
    fun test_sequence_increments() {
        let mut scenario = setup();

        {
            let mut registry = ts::take_shared<Registry>(&scenario);
            let ctx = ts::ctx(&mut scenario);

            let mut i = 0u64;
            while (i < 3) {
                settlement::record_settlement(
                    &mut registry,
                    b"REF",
                    1000,
                    12982,
                    129822,
                    x"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                    ctx,
                );
                i = i + 1;
            };

            assert!(settlement::total_settlements(&registry) == 3, 0);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    // ── test: zero-value settlement is accepted ───────────────────────────────
    #[test]
    fun test_zero_value_settlement() {
        let mut scenario = setup();

        {
            let mut registry = ts::take_shared<Registry>(&scenario);
            let ctx = ts::ctx(&mut scenario);

            settlement::record_settlement(
                &mut registry,
                b"ZERO",
                0,
                0,
                0,
                x"0000000000000000000000000000000000000000000000000000000000000000",
                ctx,
            );

            // Count still increments even for zero-value
            assert!(settlement::total_settlements(&registry) == 1, 0);
            assert!(settlement::total_myr_minor(&registry) == 0, 1);
            assert!(settlement::total_php_minor(&registry) == 0, 2);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}
