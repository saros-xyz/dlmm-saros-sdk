import { getProgram } from '../../services/getProgram';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

describe('getProgram', () => {
    let mockConnection: jest.Mocked<Connection>;

    beforeEach(() => {
        mockConnection = {
            getParsedAccountInfo: jest.fn(),
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Token Program Detection', () => {
        test('should return TOKEN_PROGRAM_ID for standard token accounts', async () => {
            const mockAddress = new PublicKey('11111111111111111111111111111112');
            const mockAccountInfo = {
                value: {
                    owner: TOKEN_PROGRAM_ID,
                },
            };

            mockConnection.getParsedAccountInfo.mockResolvedValue(mockAccountInfo as any);

            const result = await getProgram(mockAddress, mockConnection);

            expect(mockConnection.getParsedAccountInfo).toHaveBeenCalledWith(mockAddress);
            expect(result.toBase58()).toBe(TOKEN_PROGRAM_ID.toBase58());
        });

        test('should return TOKEN_2022_PROGRAM_ID for token-2022 accounts', async () => {
            const mockAddress = new PublicKey('22222222222222222222222222222222');
            const mockAccountInfo = {
                value: {
                    owner: TOKEN_2022_PROGRAM_ID,
                },
            };

            mockConnection.getParsedAccountInfo.mockResolvedValue(mockAccountInfo as any);

            const result = await getProgram(mockAddress, mockConnection);

            expect(mockConnection.getParsedAccountInfo).toHaveBeenCalledWith(mockAddress);
            expect(result).toBe(TOKEN_2022_PROGRAM_ID);
        });

        test('should return TOKEN_PROGRAM_ID for non-token-2022 accounts', async () => {
            const mockAddress = new PublicKey('33333333333333333333333333333333');
            const mockAccountInfo = {
                value: {
                    owner: new PublicKey('SomeOtherProgram1111111111111111111111111'),
                },
            };

            mockConnection.getParsedAccountInfo.mockResolvedValue(mockAccountInfo as any);

            const result = await getProgram(mockAddress, mockConnection);

            expect(mockConnection.getParsedAccountInfo).toHaveBeenCalledWith(mockAddress);
            expect(result.toBase58()).toBe(TOKEN_PROGRAM_ID.toBase58());
        });
    });

    describe('Error Handling', () => {
        test('should handle null account info gracefully', async () => {
            const mockAddress = new PublicKey('44444444444444444444444444444444');
            const mockAccountInfo = {
                value: null,
            };

            mockConnection.getParsedAccountInfo.mockResolvedValue(mockAccountInfo as any);

            const result = await getProgram(mockAddress, mockConnection);

            expect(mockConnection.getParsedAccountInfo).toHaveBeenCalledWith(mockAddress);
            expect(result.toBase58()).toBe(TOKEN_PROGRAM_ID.toBase58()); // Default fallback
        });

        test('should handle connection errors', async () => {
            const mockAddress = new PublicKey('55555555555555555555555555555555');
            const error = new Error('Connection failed');

            mockConnection.getParsedAccountInfo.mockRejectedValue(error);

            await expect(getProgram(mockAddress, mockConnection)).rejects.toThrow('Connection failed');
        });
    });

    describe('Input Validation', () => {
        test('should accept valid PublicKey addresses', async () => {
            const mockAddress = new PublicKey('66666666666666666666666666666666');
            const mockAccountInfo = {
                value: {
                    owner: TOKEN_PROGRAM_ID,
                },
            };

            mockConnection.getParsedAccountInfo.mockResolvedValue(mockAccountInfo as any);

            const result = await getProgram(mockAddress, mockConnection);

            expect(result).toBe(TOKEN_PROGRAM_ID);
        });
    });
});
