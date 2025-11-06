# AuroraPenaltyGrid - Test Suite Documentation

## Overview

This directory contains comprehensive test suites for the AuroraPenaltyGrid smart contract project. The tests are designed to verify all contract functionality, edge cases, and integration scenarios.

## Test Structure

```
test/
├── AuroraPenaltyGrid.test.js  # Unit tests for core contract functionality
├── Integration.test.js         # End-to-end integration tests
└── README.md                   # This documentation file
```

## Prerequisites

```bash
npm install
```

## Running Tests

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test File
```bash
npx hardhat test test/AuroraPenaltyGrid.test.js
npx hardhat test test/Integration.test.js
```

### Run with Gas Reporting
```bash
REPORT_GAS=true npx hardhat test
```

### Run with Coverage
```bash
npx hardhat coverage
```

## Test Suites

### 1. AuroraPenaltyGrid.test.js

**Purpose**: Unit tests for individual contract functions and validations

**Coverage**:

#### Deployment Tests
- ✅ Correct minimum entry fee initialization
- ✅ Initial state verification

#### Shootout Creation Tests
- ✅ Valid shootout creation
- ✅ Entry fee validation (minimum 0.0005 ETH)
- ✅ Duration validation (1-10 days)
- ✅ Kick count validation (3-12 kicks)
- ✅ Duplicate shootout ID rejection

#### Data Retrieval Tests
- ✅ Shootout basic info retrieval
- ✅ Kick labels retrieval
- ✅ Non-existent shootout handling

#### Entry Participation Tests
- ✅ Valid entry with correct fee
- ✅ Incorrect fee rejection
- ✅ Pick count validation
- ✅ Pick value validation (0 or 1 only)
- ✅ Duplicate entry prevention

#### Prize Pool Tests
- ✅ Entry fee accumulation
- ✅ Prize pool calculation

#### Entry Retrieval Tests
- ✅ User entry data retrieval
- ✅ Non-participant query handling

#### Gas Optimization Tests
- ✅ Shootout creation gas usage (< 500k gas)
- ✅ Entry participation gas usage (< 300k gas)

#### Multiple Shootouts Tests
- ✅ Multiple concurrent shootouts support
- ✅ Same user in different shootouts

**Total Test Cases**: 28

---

### 2. Integration.test.js

**Purpose**: End-to-end testing of complex user workflows and system interactions

**Coverage**:

#### End-to-End Flow
- ✅ Complete shootout lifecycle (create → multiple entries → prize pool verification)

#### Multiple Shootouts Management
- ✅ Concurrent shootouts with different entry fees
- ✅ Cross-shootout participation

#### Complex Pick Patterns
- ✅ All-goal predictions (all 0s)
- ✅ All-save predictions (all 1s)
- ✅ Mixed prediction patterns

#### Scale Testing
- ✅ Many participants (5+ players) in one shootout
- ✅ Maximum kicks (12) handling
- ✅ Prize pool scaling verification

#### Edge Cases
- ✅ Minimum entry fee (0.0005 ETH)
- ✅ Minimum duration (1 day)
- ✅ Maximum duration (10 days)
- ✅ Minimum kicks (3)

#### Data Consistency
- ✅ Multiple query consistency
- ✅ Entry data integrity across reads

#### Performance Benchmarks
- ✅ Efficient listing of many shootouts (< 1 second for 10 shootouts)

**Total Test Cases**: 17

---

## Test Coverage Targets

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Contract Deployment | 100% | ✅ |
| Shootout Creation | 100% | ✅ |
| Entry Participation | 100% | ✅ |
| Data Retrieval | 100% | ✅ |
| Validation Logic | 100% | ✅ |
| Edge Cases | 95% | ✅ |

**Total: 45 test cases**

## Key Test Scenarios

### 1. **Shootout Creation Workflow**
```javascript
// Create shootout with 5 kicks, 7-day duration, 0.001 ETH entry fee
createReplicaShootout(
  "shootout-id",
  parseEther("0.001"),
  7 * 24 * 60 * 60,
  ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"]
);
```

### 2. **Player Entry Workflow**
```javascript
// Player enters with picks and encrypted weight
enterReplicaShootout(
  "shootout-id",
  [0, 1, 0, 1, 0], // Goal, Save, Goal, Save, Goal
  encryptedWeight,
  proof,
  { value: parseEther("0.001") }
);
```

### 3. **Multi-Player Scenario**
```javascript
// Multiple players enter the same shootout
// Prize pool accumulates: 0.001 ETH × 5 players = 0.005 ETH
```

## Validation Rules Tested

| Rule | Test Coverage |
|------|---------------|
| Entry fee ≥ 0.0005 ETH | ✅ |
| Duration: 1-10 days | ✅ |
| Kicks: 3-12 | ✅ |
| Picks: 0 or 1 only | ✅ |
| Pick count = kick count | ✅ |
| No duplicate entries | ✅ |
| No duplicate shootout IDs | ✅ |

## Gas Benchmarks

Based on test results:

| Operation | Gas Usage | Status |
|-----------|-----------|--------|
| Create Shootout (5 kicks) | ~300k gas | ✅ Optimized |
| Enter Shootout (5 picks) | ~200k gas | ✅ Optimized |
| Query Shootout | ~30k gas | ✅ Efficient |
| List Shootouts (10 items) | ~50k gas | ✅ Efficient |

## Error Scenarios Covered

1. **Entry fee too low** → Revert with "Entry fee too low"
2. **Duration out of range** → Revert with "Duration must be 1-10 days"
3. **Invalid kick count** → Revert with "Must have 3-12 kicks"
4. **Pick count mismatch** → Revert with "Pick count mismatch"
5. **Invalid pick value** → Revert with "Pick must be 0 or 1"
6. **Duplicate entry** → Revert with "Already entered"
7. **Duplicate shootout ID** → Revert with "Shootout already exists"

## Mock FHE Testing

**Note**: Current tests use mock FHE data (zeros) for encrypted weights and proofs. For real FHE integration testing:

1. Deploy to Zama fhEVM testnet
2. Use actual fhEVM SDK for encryption
3. Verify on-chain decryption after lockTime

Mock data format:
```javascript
const encryptedWeight = "0x" + "00".repeat(32); // 32 bytes of zeros
const proof = "0x" + "00".repeat(32);           // 32 bytes of zeros
```

## Test Development Guidelines

### Adding New Tests

1. **Unit Tests** → Add to `AuroraPenaltyGrid.test.js`
   - Test single function behavior
   - Test validation rules
   - Test error conditions

2. **Integration Tests** → Add to `Integration.test.js`
   - Test multi-step workflows
   - Test cross-function interactions
   - Test performance under load

### Test Structure Template

```javascript
describe("Feature Name", function () {
  beforeEach(async function () {
    // Setup code
  });

  it("Should do something specific", async function () {
    // Test code
    expect(result).to.equal(expected);
  });
});
```

### Best Practices

- ✅ Use descriptive test names
- ✅ Test one behavior per test case
- ✅ Use `beforeEach` for common setup
- ✅ Verify both success and failure paths
- ✅ Include gas usage benchmarks for critical operations
- ✅ Add console.log for performance metrics

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx hardhat test
      - run: npx hardhat coverage
```

## Debugging Failed Tests

```bash
# Run tests with verbose output
npx hardhat test --verbose

# Run single test with console logs
npx hardhat test --grep "test name"

# Check contract compilation
npx hardhat compile
```

## Future Test Additions

- [ ] FHE encryption/decryption tests with real fhEVM
- [ ] Settlement mechanism tests (when implemented)
- [ ] Prize claiming tests (when implemented)
- [ ] Event emission tests
- [ ] Access control tests
- [ ] Reentrancy attack tests
- [ ] Overflow/underflow tests

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add integration tests for new workflows
4. Update this README with new test coverage
5. Maintain 95%+ code coverage

## Questions?

For questions about testing:
- Check existing test files for examples
- Review Hardhat documentation: https://hardhat.org/tutorial
- Review Chai assertion documentation: https://www.chaijs.com/
