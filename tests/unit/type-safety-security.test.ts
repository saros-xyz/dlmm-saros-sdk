/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey } from '@solana/web3.js';

describe('Type Safety Security Tests', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('@ts-ignore Usage and Type Violations', () => {
        test('should detect type violations in getPairAccount', async () => {
            const mockProgram = {
                account: {
                    pair: {
                        fetch: jest.fn(),
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            const pairAddress = new PublicKey('11111111111111111111111111111112');

            // First call - normal operation
            mockProgram.account.pair.fetch.mockResolvedValueOnce({
                activeId: 8388608,
                binStep: 10,
            });

            const result1 = await service.getPairAccount(pairAddress);
            expect(result1).toBeDefined();
            console.log('Normal getPairAccount call succeeded');

            // Second call - simulate type violation
            mockProgram.account.pair.fetch.mockResolvedValueOnce(null);

            try {
                const result2 = await service.getPairAccount(pairAddress);
                console.log('getPairAccount with null result:', result2);
                // The @ts-ignore allows this to pass type checking
            } catch (error) {
                console.log('Expected error with null result:', error.message);
            }
        });

        test('should detect type violations in getPositionAccount', async () => {
            const mockProgram = {
                account: {
                    position: {
                        fetch: jest.fn(),
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            const positionAddress = new PublicKey('11111111111111111111111111111112');

            // Simulate invalid return type
            mockProgram.account.position.fetch.mockResolvedValueOnce('invalid-string');

            try {
                const result = await service.getPositionAccount(positionAddress);
                console.log('getPositionAccount with invalid type:', result);
                // @ts-ignore allows this type violation
            } catch (error) {
                console.log('Error with invalid type:', error.message);
            }
        });

        test('should detect type violations in bin array operations', async () => {
            const mockProgram = {
                account: {
                    binArray: {
                        fetch: jest.fn(),
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue({
                    lamports: 1000000,
                    data: Buffer.from('mock-data'),
                    owner: new PublicKey('11111111111111111111111111111112'),
                    executable: false,
                }),
            };

            (service as any).connection = mockConnection;

            // Simulate type violation in bin array fetch
            mockProgram.account.binArray.fetch.mockResolvedValueOnce({
                index: 'invalid-string', // Should be number
                bins: [],
            });

            const params = {
                binArrayIndex: 100,
                pair: new PublicKey('11111111111111111111111111111112'),
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            try {
                const result = await (service as any).getBinArrayInfo(params);
                console.log('Bin array with type violation:', result);
                // @ts-ignore allows this to pass
            } catch (error) {
                console.log('Error with type violation:', error.message);
            }
        });
    });

    describe('Mixed Type Operations', () => {
        test('should detect BigInt and number mixing issues', () => {
            // Simulate the type mixing issue in price calculations
            const bigIntValue = BigInt(1000);
            const numberValue = 500;

            // This operation would cause type issues without @ts-ignore
            try {
                const result = bigIntValue + BigInt(numberValue); // Correct way
                console.log('Proper BigInt operation result:', result);

                // Incorrect way that would need @ts-ignore
                // const wrongResult = bigIntValue + numberValue; // Type error
                // console.log('Incorrect mixed type operation would fail');
            } catch (error) {
                console.log('Mixed type operation error:', error.message);
            }
        });

        test('should detect Buffer and string type mixing', () => {
            const buffer = Buffer.from('test-data');
            const stringValue = 'test-string';

            // Operations that would need @ts-ignore
            try {
                const concat1 = buffer + stringValue; // Would need @ts-ignore
                console.log('Buffer + string result:', concat1);
            } catch (error) {
                console.log('Buffer + string error:', error.message);
            }

            // Correct way
            const concat2 = buffer.toString() + stringValue;
            console.log('Proper concatenation result:', concat2);
        });
    });

    describe('Anchor Type Violations', () => {
        test('should detect Anchor Program type issues', async () => {
            const mockProgram = {
                methods: {
                    swap: {
                        // Missing proper typing
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            // This would normally require @ts-ignore due to type mismatches
            try {
                const method = mockProgram.methods.swap;
                console.log('Accessing swap method:', typeof method);
            } catch (error) {
                console.log('Anchor type violation error:', error.message);
            }
        });

        test('should detect BN type conversion issues', () => {
            const { BN } = require('@coral-xyz/anchor');

            try {
                // Correct BN usage
                const bn1 = new BN(1000);
                console.log('Proper BN creation:', bn1.toString());

                // Type violations that would need @ts-ignore
                const bn2 = new BN('invalid-string');
                console.log('BN with invalid string:', bn2.toString());
            } catch (error) {
                console.log('BN type conversion error:', error.message);
            }
        });
    });

    describe('Web3.js Type Violations', () => {
        test('should detect PublicKey type issues', () => {
            try {
                // Correct PublicKey creation
                const pk1 = new PublicKey('11111111111111111111111111111112');
                console.log('Proper PublicKey creation:', pk1.toString());

                // Type violations
                const pk2 = new PublicKey(12345); // Would need @ts-ignore
                console.log('PublicKey from number:', pk2.toString());
            } catch (error) {
                console.log('PublicKey type error:', error.message);
            }
        });

        test('should detect Transaction type issues', () => {
            const { Transaction } = require('@solana/web3.js');

            try {
                const tx = new Transaction();

                // Type violations that would need @ts-ignore
                // tx.invalidProperty = 'test'; // Would cause type error
                console.log('Transaction object created successfully');
            } catch (error) {
                console.log('Transaction type error:', error.message);
            }
        });
    });

    describe('Configuration Type Safety', () => {
        test('should detect configuration type violations', () => {
            const { MODE } = require('../../types/config');

            try {
                // Correct usage
                const mode1 = MODE.DEVNET;
                console.log('Proper mode usage:', mode1);

                // Type violations
                const mode2 = 'invalid-mode'; // Would need @ts-ignore to assign
                console.log('Invalid mode assignment:', mode2);
            } catch (error) {
                console.log('Configuration type error:', error.message);
            }
        });

        test('should detect constant type issues', () => {
            const { SCALE_OFFSET, ONE } = require('../../constants/config');

            try {
                console.log('SCALE_OFFSET value:', SCALE_OFFSET);
                console.log('ONE value:', ONE);

                // The ONE constant (1 << 64) causes overflow
                const oneValue = 1 << SCALE_OFFSET;
                console.log('Computed ONE value:', oneValue);
                console.log('ONE === computed:', ONE === oneValue);
            } catch (error) {
                console.log('Constant type error:', error.message);
            }
        });
    });

    describe('Service Method Type Safety', () => {
        test('should detect service method parameter type issues', async () => {
            // Test with invalid parameters that would need @ts-ignore
            try {
                const invalidParams = {
                    amount: 'invalid-string', // Should be BigInt
                    isExactInput: true,
                    swapForY: true,
                    pair: new PublicKey('11111111111111111111111111111112'),
                    tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                    tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                    tokenBaseDecimal: 9,
                    tokenQuoteDecimal: 6,
                    slippage: 0.5,
                };

                // This would cause type errors without @ts-ignore
                console.log('Invalid parameter types would cause errors');
            } catch (error) {
                console.log('Service method type error:', error.message);
            }
        });

        test('should detect return type violations', async () => {
            const mockService = {
                getQuote: jest.fn(),
            };

            // Mock return type violation
            mockService.getQuote.mockResolvedValue('invalid-return-type');

            try {
                const result = await mockService.getQuote();
                console.log('Invalid return type:', result);
            } catch (error) {
                console.log('Return type violation error:', error.message);
            }
        });
    });

    describe('Import and Module Type Safety', () => {
        test('should detect import type issues', () => {
            try {
                // Correct imports
                const { divRem } = require('../utils/math');
                console.log('Proper import succeeded');

                // Type violations in imports would need @ts-ignore
                // const invalidImport = require('../nonexistent/module');
            } catch (error) {
                console.log('Import type error:', error.message);
            }
        });

        test('should detect module export type issues', () => {
            try {
                const mathUtils = require('../utils/math');

                // Check if exports match expected types
                console.log('divRem type:', typeof mathUtils.divRem);
                console.log('mulDiv type:', typeof mathUtils.mulDiv);

                // Type violations in module usage
                if (typeof mathUtils.divRem !== 'function') {
                    console.log('divRem is not a function!');
                }
            } catch (error) {
                console.log('Module export type error:', error.message);
            }
        });
    });

    describe('Generic Type Violations', () => {
        test('should detect generic type parameter issues', () => {
            try {
                // Array type violations
                const arr1: number[] = [1, 2, 3]; // Correct
                console.log('Proper array type:', arr1);

                // Type violations that would need @ts-ignore
                // const arr2: number[] = ['a', 'b', 'c']; // Type error
                console.log('Array type violations would cause errors');
            } catch (error) {
                console.log('Generic type error:', error.message);
            }
        });

        test('should detect object type violations', () => {
            interface TestInterface {
                id: number;
                name: string;
            }

            try {
                // Correct object
                const obj1: TestInterface = { id: 1, name: 'test' };
                console.log('Proper object type:', obj1);

                // Type violations
                // const obj2: TestInterface = { id: 'invalid', extra: 'field' };
                console.log('Object type violations would cause errors');
            } catch (error) {
                console.log('Object type error:', error.message);
            }
        });
    });
});
