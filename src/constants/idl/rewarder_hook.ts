/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rewarder_hook.json`.
 */
export type RewarderHook = {
  address: 'mdmavMvJpF4ZcLJNg6VSjuKVMiBo5uKwERTg1ZB9yUH';
  metadata: {
    name: 'rewarderHook';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Created with Anchor';
  };
  instructions: [
    {
      name: 'beforeBurn';
      discriminator: [7, 177, 19, 160, 28, 229, 57, 73];
      accounts: [
        {
          name: 'pairAccount';
        },
        {
          name: 'hook';
          writable: true;
          relations: [
            'activeBinHookBinArrayLower',
            'activeBinHookBinArrayUpper',
            'positionHookBinArrayLower',
            'positionHookBinArrayUpper',
          ];
        },
        {
          name: 'position';
        },
        {
          name: 'activeBinArrayLower';
        },
        {
          name: 'activeBinArrayUpper';
        },
        {
          name: 'pair';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'hookPosition';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 111, 115, 105, 116, 105, 111, 110];
              },
              {
                kind: 'account';
                path: 'hook';
              },
              {
                kind: 'account';
                path: 'position';
              },
            ];
          };
        },
        {
          name: 'positionHookBinArrayLower';
          writable: true;
        },
        {
          name: 'positionHookBinArrayUpper';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'beforeMint';
      discriminator: [67, 27, 57, 7, 28, 168, 109, 153];
      accounts: [
        {
          name: 'pairAccount';
        },
        {
          name: 'hook';
          writable: true;
          relations: [
            'activeBinHookBinArrayLower',
            'activeBinHookBinArrayUpper',
            'positionHookBinArrayLower',
            'positionHookBinArrayUpper',
          ];
        },
        {
          name: 'position';
        },
        {
          name: 'activeBinArrayLower';
        },
        {
          name: 'activeBinArrayUpper';
        },
        {
          name: 'pair';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'hookPosition';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 111, 115, 105, 116, 105, 111, 110];
              },
              {
                kind: 'account';
                path: 'hook';
              },
              {
                kind: 'account';
                path: 'position';
              },
            ];
          };
        },
        {
          name: 'positionHookBinArrayLower';
          writable: true;
        },
        {
          name: 'positionHookBinArrayUpper';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'beforeSwap';
      discriminator: [227, 59, 240, 68, 164, 9, 29, 254];
      accounts: [
        {
          name: 'pairAccount';
        },
        {
          name: 'hook';
          writable: true;
          relations: ['activeBinHookBinArrayLower', 'activeBinHookBinArrayUpper'];
        },
        {
          name: 'activeBinArrayLower';
        },
        {
          name: 'activeBinArrayUpper';
        },
        {
          name: 'pair';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'claim';
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210];
      accounts: [
        {
          name: 'hook';
          writable: true;
          relations: [
            'activeBinHookBinArrayLower',
            'activeBinHookBinArrayUpper',
            'positionHookBinArrayLower',
            'positionHookBinArrayUpper',
          ];
        },
        {
          name: 'pair';
          relations: ['hook', 'position', 'activeBinArrayLower', 'activeBinArrayUpper'];
        },
        {
          name: 'position';
        },
        {
          name: 'positionMint';
          relations: ['position'];
        },
        {
          name: 'positionTokenAccount';
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'user';
              },
              {
                kind: 'account';
                path: 'positionTokenProgram';
              },
              {
                kind: 'account';
                path: 'positionMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'activeBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinArrayUpper';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'hookPosition';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 111, 115, 105, 116, 105, 111, 110];
              },
              {
                kind: 'account';
                path: 'hook';
              },
              {
                kind: 'account';
                path: 'position';
              },
            ];
          };
        },
        {
          name: 'positionHookBinArrayLower';
          writable: true;
        },
        {
          name: 'positionHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'rewardTokenMint';
        },
        {
          name: 'hookReserve';
          writable: true;
          relations: ['hook'];
        },
        {
          name: 'userReserve';
          writable: true;
        },
        {
          name: 'user';
          signer: true;
        },
        {
          name: 'rewardTokenProgram';
        },
        {
          name: 'positionTokenProgram';
        },
        {
          name: 'memoProgram';
          address: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [];
    },
    {
      name: 'initializeBinArray';
      discriminator: [35, 86, 19, 185, 78, 212, 75, 211];
      accounts: [
        {
          name: 'hook';
        },
        {
          name: 'binArray';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [98, 105, 110, 95, 97, 114, 114, 97, 121];
              },
              {
                kind: 'account';
                path: 'hook';
              },
              {
                kind: 'arg';
                path: 'index';
              },
            ];
          };
        },
        {
          name: 'user';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'index';
          type: 'u32';
        },
      ];
    },
    {
      name: 'initializeHook';
      discriminator: [37, 101, 119, 255, 156, 39, 252, 232];
      accounts: [
        {
          name: 'hook';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [104, 111, 111, 107];
              },
              {
                kind: 'account';
                path: 'hookAuthority';
              },
              {
                kind: 'arg';
                path: 'pair';
              },
            ];
          };
        },
        {
          name: 'rewardTokenMint';
        },
        {
          name: 'hookReserve';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'hook';
              },
              {
                kind: 'account';
                path: 'rewardTokenMintTokenProgram';
              },
              {
                kind: 'account';
                path: 'rewardTokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'hookAuthority';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'rewardTokenMintTokenProgram';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'lbPair';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'initializePosition';
      discriminator: [219, 192, 234, 71, 190, 191, 102, 80];
      accounts: [
        {
          name: 'hook';
        },
        {
          name: 'lbPosition';
        },
        {
          name: 'position';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 111, 115, 105, 116, 105, 111, 110];
              },
              {
                kind: 'account';
                path: 'hook';
              },
              {
                kind: 'account';
                path: 'lbPosition';
              },
            ];
          };
        },
        {
          name: 'user';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [];
    },
    {
      name: 'onHookSet';
      discriminator: [23, 126, 214, 186, 197, 123, 0, 235];
      accounts: [
        {
          name: 'pairAccount';
        },
        {
          name: 'hook';
        },
        {
          name: 'pair';
          signer: true;
          relations: ['hook'];
        },
      ];
      args: [];
    },
    {
      name: 'setRewardRange';
      discriminator: [124, 43, 236, 120, 6, 88, 112, 213];
      accounts: [
        {
          name: 'hook';
          writable: true;
          relations: ['activeBinHookBinArrayLower', 'activeBinHookBinArrayUpper'];
        },
        {
          name: 'pair';
          relations: ['hook', 'activeBinArrayLower', 'activeBinArrayUpper'];
        },
        {
          name: 'activeBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinArrayUpper';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'hookReserve';
          relations: ['hook'];
        },
        {
          name: 'authority';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'deltaBinA';
          type: 'i32';
        },
        {
          name: 'deltaBinB';
          type: 'i32';
        },
      ];
    },
    {
      name: 'setRewardsParameters';
      discriminator: [86, 145, 230, 205, 136, 137, 140, 193];
      accounts: [
        {
          name: 'hook';
          writable: true;
          relations: ['activeBinHookBinArrayLower', 'activeBinHookBinArrayUpper'];
        },
        {
          name: 'pair';
          relations: ['hook', 'activeBinArrayLower', 'activeBinArrayUpper'];
        },
        {
          name: 'activeBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinArrayUpper';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'hookReserve';
          relations: ['hook'];
        },
        {
          name: 'authority';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'rewardsPerSecond';
          type: 'u64';
        },
        {
          name: 'startTime';
          type: 'i64';
        },
        {
          name: 'duration';
          type: 'i64';
        },
      ];
    },
    {
      name: 'setRewardsPerSecond';
      discriminator: [77, 81, 53, 27, 248, 29, 133, 203];
      accounts: [
        {
          name: 'hook';
          writable: true;
          relations: ['activeBinHookBinArrayLower', 'activeBinHookBinArrayUpper'];
        },
        {
          name: 'pair';
          relations: ['hook', 'activeBinArrayLower', 'activeBinArrayUpper'];
        },
        {
          name: 'activeBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinArrayUpper';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayLower';
          writable: true;
        },
        {
          name: 'activeBinHookBinArrayUpper';
          writable: true;
        },
        {
          name: 'hookReserve';
          relations: ['hook'];
        },
        {
          name: 'authority';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'rewardsPerSecond';
          type: 'u64';
        },
        {
          name: 'duration';
          type: 'i64';
        },
      ];
    },
    {
      name: 'sweep';
      discriminator: [40, 23, 234, 175, 14, 61, 154, 177];
      accounts: [
        {
          name: 'hook';
          writable: true;
        },
        {
          name: 'rewardTokenMint';
        },
        {
          name: 'hookReserve';
          writable: true;
          relations: ['hook'];
        },
        {
          name: 'authorityReserve';
          writable: true;
        },
        {
          name: 'authority';
          signer: true;
          relations: ['hook'];
        },
        {
          name: 'rewardTokenProgram';
        },
        {
          name: 'memoProgram';
          address: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: 'binArray';
      discriminator: [92, 142, 92, 220, 5, 148, 70, 181];
    },
    {
      name: 'hook';
      discriminator: [125, 61, 76, 173, 200, 161, 92, 217];
    },
    {
      name: 'hookBinArray';
      discriminator: [103, 134, 57, 58, 74, 234, 9, 157];
    },
    {
      name: 'hookPosition';
      discriminator: [125, 149, 132, 62, 52, 71, 211, 143];
    },
    {
      name: 'pair';
      discriminator: [85, 72, 49, 176, 182, 228, 141, 82];
    },
    {
      name: 'position';
      discriminator: [170, 188, 143, 228, 122, 64, 247, 208];
    },
  ];
  events: [
    {
      name: 'claimEvent';
      discriminator: [93, 15, 70, 170, 48, 140, 212, 219];
    },
    {
      name: 'deltaBinSetEvent';
      discriminator: [0, 208, 34, 219, 151, 91, 139, 244];
    },
    {
      name: 'hookInitializationEvent';
      discriminator: [229, 217, 175, 38, 112, 240, 117, 95];
    },
    {
      name: 'rewardParametersSetEvent';
      discriminator: [191, 11, 46, 163, 150, 8, 126, 245];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'checkedAddSignedOverflow';
      msg: 'Checked add signed overflow';
    },
    {
      code: 6001;
      name: 'checkedAddOverflow';
      msg: 'Checked add overflow';
    },
    {
      code: 6002;
      name: 'hookBinArrayIndexMismatch';
      msg: 'Hook bin array index mismatch';
    },
    {
      code: 6003;
      name: 'binNotFound';
      msg: 'Bin not found';
    },
    {
      code: 6004;
      name: 'shlDivError';
      msg: 'Shift left division error';
    },
    {
      code: 6005;
      name: 'mulDivError';
      msg: 'Mul div error';
    },
    {
      code: 6006;
      name: 'mulShrError';
      msg: 'Mul shr error';
    },
    {
      code: 6007;
      name: 'checkedMulOverflow';
      msg: 'Checked Mul overflow';
    },
    {
      code: 6008;
      name: 'invalidStartTime';
      msg: 'Invalid start time';
    },
    {
      code: 6009;
      name: 'checkedSubUnderflow';
      msg: 'Checked sub underflow';
    },
    {
      code: 6010;
      name: 'zeroRewards';
      msg: "Rewarder won't distribute any rewards";
    },
    {
      code: 6011;
      name: 'invalidDeltaBins';
      msg: 'Invalid delta bins';
    },
    {
      code: 6012;
      name: 'invalidLbPosition';
      msg: 'Invalid LB position';
    },
  ];
  types: [
    {
      name: 'bin';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'totalSupply';
            type: 'u128';
          },
          {
            name: 'reserveX';
            type: 'u64';
          },
          {
            name: 'reserveY';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'binArray';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pair';
            type: 'pubkey';
          },
          {
            name: 'bins';
            type: {
              array: [
                {
                  defined: {
                    name: 'bin';
                  };
                },
                256,
              ];
            };
          },
          {
            name: 'index';
            type: 'u32';
          },
          {
            name: 'space';
            type: {
              array: ['u8', 12];
            };
          },
        ];
      };
    },
    {
      name: 'claimEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hook';
            type: 'pubkey';
          },
          {
            name: 'user';
            type: 'pubkey';
          },
          {
            name: 'rewards';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'deltaBinSetEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hook';
            type: 'pubkey';
          },
          {
            name: 'deltaBinA';
            type: 'i32';
          },
          {
            name: 'deltaBinB';
            type: 'i32';
          },
        ];
      };
    },
    {
      name: 'dynamicFeeParameters';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'timeLastUpdated';
            type: 'u64';
          },
          {
            name: 'volatilityAccumulator';
            type: 'u32';
          },
          {
            name: 'volatilityReference';
            type: 'u32';
          },
          {
            name: 'idReference';
            type: 'u32';
          },
          {
            name: 'space';
            type: {
              array: ['u8', 4];
            };
          },
        ];
      };
    },
    {
      name: 'hook';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'authority';
            type: 'pubkey';
          },
          {
            name: 'pair';
            type: 'pubkey';
          },
          {
            name: 'rewardTokenMint';
            type: 'pubkey';
          },
          {
            name: 'hookReserve';
            type: 'pubkey';
          },
          {
            name: 'rewardsPerSecond';
            type: 'u64';
          },
          {
            name: 'endTime';
            type: 'i64';
          },
          {
            name: 'lastUpdate';
            type: 'i64';
          },
          {
            name: 'deltaBinA';
            type: 'i32';
          },
          {
            name: 'deltaBinB';
            type: 'i32';
          },
          {
            name: 'totalUnclaimedRewards';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'hookBinArray';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hook';
            type: 'pubkey';
          },
          {
            name: 'index';
            type: 'u32';
          },
          {
            name: 'space';
            type: {
              array: ['u8', 28];
            };
          },
          {
            name: 'accruedRewardsPerShare';
            type: {
              array: ['u128', 256];
            };
          },
        ];
      };
    },
    {
      name: 'hookInitializationEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'authority';
            type: 'pubkey';
          },
          {
            name: 'pair';
            type: 'pubkey';
          },
          {
            name: 'hook';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'hookPosition';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'userAccruedRewardsPerShare';
            type: {
              array: ['u128', 64];
            };
          },
          {
            name: 'pendingRewards';
            type: 'u64';
          },
          {
            name: 'bump';
            type: 'u8';
          },
          {
            name: 'space';
            type: {
              array: ['u8', 7];
            };
          },
        ];
      };
    },
    {
      name: 'pair';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'liquidityBookConfig';
            type: 'pubkey';
          },
          {
            name: 'binStep';
            type: 'u8';
          },
          {
            name: 'binStepSeed';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'tokenMintX';
            type: 'pubkey';
          },
          {
            name: 'tokenMintY';
            type: 'pubkey';
          },
          {
            name: 'staticFeeParameters';
            type: {
              defined: {
                name: 'staticFeeParameters';
              };
            };
          },
          {
            name: 'activeId';
            type: 'u32';
          },
          {
            name: 'dynamicFeeParameters';
            type: {
              defined: {
                name: 'dynamicFeeParameters';
              };
            };
          },
          {
            name: 'protocolFeesX';
            type: 'u64';
          },
          {
            name: 'protocolFeesY';
            type: 'u64';
          },
          {
            name: 'hook';
            type: {
              option: 'pubkey';
            };
          },
        ];
      };
    },
    {
      name: 'position';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pair';
            type: 'pubkey';
          },
          {
            name: 'positionMint';
            type: 'pubkey';
          },
          {
            name: 'liquidityShares';
            type: {
              array: ['u128', 64];
            };
          },
          {
            name: 'lowerBinId';
            type: 'u32';
          },
          {
            name: 'upperBinId';
            type: 'u32';
          },
          {
            name: 'space';
            type: {
              array: ['u8', 8];
            };
          },
        ];
      };
    },
    {
      name: 'rewardParametersSetEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hook';
            type: 'pubkey';
          },
          {
            name: 'rewardsPerSecond';
            type: 'u64';
          },
          {
            name: 'startTime';
            type: 'i64';
          },
          {
            name: 'duration';
            type: 'i64';
          },
        ];
      };
    },
    {
      name: 'staticFeeParameters';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'baseFactor';
            type: 'u16';
          },
          {
            name: 'filterPeriod';
            type: 'u16';
          },
          {
            name: 'decayPeriod';
            type: 'u16';
          },
          {
            name: 'reductionFactor';
            type: 'u16';
          },
          {
            name: 'variableFeeControl';
            type: 'u32';
          },
          {
            name: 'maxVolatilityAccumulator';
            type: 'u32';
          },
          {
            name: 'protocolShare';
            type: 'u16';
          },
          {
            name: 'space';
            type: {
              array: ['u8', 2];
            };
          },
        ];
      };
    },
  ];
};
