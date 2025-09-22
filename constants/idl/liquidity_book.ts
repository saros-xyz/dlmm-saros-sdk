/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/liquidity_book.json`.
 */
export type LiquidityBook = {
  "address": "1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE",
  "metadata": {
    "name": "liquidityBook",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptConfigOwnership",
      "discriminator": [
        6,
        212,
        14,
        48,
        229,
        38,
        62,
        241
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig",
          "writable": true
        },
        {
          "name": "pendingPresetAuthority",
          "signer": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "closePosition",
      "discriminator": [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      "accounts": [
        {
          "name": "pair",
          "writable": true,
          "relations": [
            "position",
            "binArrayLower",
            "binArrayUpper"
          ]
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "positionMint",
          "writable": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "positionTokenProgram"
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenMintX",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenMintY",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "tokenProgramX"
        },
        {
          "name": "tokenProgramY"
        },
        {
          "name": "positionTokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "hook",
          "writable": true,
          "optional": true
        },
        {
          "name": "hooksProgram",
          "optional": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "createPosition",
      "discriminator": [
        48,
        215,
        197,
        153,
        96,
        203,
        180,
        133
      ],
      "accounts": [
        {
          "name": "pair"
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ]
          }
        },
        {
          "name": "positionMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "relativeBinIdLeft",
          "type": "i32"
        },
        {
          "name": "relativeBinInRight",
          "type": "i32"
        }
      ]
    },
    {
      "name": "decreasePosition",
      "discriminator": [
        57,
        125,
        21,
        59,
        200,
        137,
        179,
        108
      ],
      "accounts": [
        {
          "name": "pair",
          "writable": true,
          "relations": [
            "position",
            "binArrayLower",
            "binArrayUpper"
          ]
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "positionMint",
          "writable": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "positionTokenProgram"
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenMintX",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenMintY",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "tokenProgramX"
        },
        {
          "name": "tokenProgramY"
        },
        {
          "name": "positionTokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "hook",
          "writable": true,
          "optional": true
        },
        {
          "name": "hooksProgram",
          "optional": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "shares",
          "type": {
            "vec": "u128"
          }
        }
      ]
    },
    {
      "name": "increasePosition",
      "discriminator": [
        253,
        234,
        128,
        104,
        192,
        188,
        45,
        91
      ],
      "accounts": [
        {
          "name": "pair",
          "writable": true,
          "relations": [
            "position",
            "binArrayLower",
            "binArrayUpper"
          ]
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "positionMint",
          "writable": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "positionTokenProgram"
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenMintX",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenMintY",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "tokenProgramX"
        },
        {
          "name": "tokenProgramY"
        },
        {
          "name": "positionTokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "hook",
          "writable": true,
          "optional": true
        },
        {
          "name": "hooksProgram",
          "optional": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amountX",
          "type": "u64"
        },
        {
          "name": "amountY",
          "type": "u64"
        },
        {
          "name": "liquidityDistribution",
          "type": {
            "vec": {
              "defined": {
                "name": "binLiquidityDistribution"
              }
            }
          }
        }
      ]
    },
    {
      "name": "initializeBinArray",
      "discriminator": [
        35,
        86,
        19,
        185,
        78,
        212,
        75,
        211
      ],
      "accounts": [
        {
          "name": "pair"
        },
        {
          "name": "binArray",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  97,
                  114,
                  114,
                  97,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "arg",
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initializeBinStepConfig",
      "discriminator": [
        2,
        168,
        136,
        251,
        163,
        9,
        132,
        255
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig"
        },
        {
          "name": "binStepConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  115,
                  116,
                  101,
                  112,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "liquidityBookConfig"
              },
              {
                "kind": "arg",
                "path": "binStep"
              }
            ]
          }
        },
        {
          "name": "presetAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "binStep",
          "type": "u8"
        },
        {
          "name": "availability",
          "type": {
            "defined": {
              "name": "configAvailability"
            }
          }
        },
        {
          "name": "feeParameters",
          "type": {
            "defined": {
              "name": "staticFeeParameters"
            }
          }
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "feeAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializePair",
      "discriminator": [
        177,
        114,
        226,
        34,
        186,
        150,
        5,
        245
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig"
        },
        {
          "name": "tokenMintX"
        },
        {
          "name": "tokenMintY"
        },
        {
          "name": "binStepConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  110,
                  95,
                  115,
                  116,
                  101,
                  112,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "liquidityBookConfig"
              },
              {
                "kind": "account",
                "path": "bin_step_config.bin_step",
                "account": "binStepConfig"
              }
            ]
          }
        },
        {
          "name": "quoteAssetBadge",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  95,
                  98,
                  97,
                  100,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "liquidityBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMintY"
              }
            ]
          }
        },
        {
          "name": "pair",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "liquidityBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMintX"
              },
              {
                "kind": "account",
                "path": "tokenMintY"
              },
              {
                "kind": "account",
                "path": "bin_step_config.bin_step",
                "account": "binStepConfig"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "activeId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initializeQuoteAssetBadge",
      "discriminator": [
        115,
        174,
        34,
        42,
        176,
        5,
        229,
        207
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig"
        },
        {
          "name": "quoteAssetBadge",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  95,
                  98,
                  97,
                  100,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "liquidityBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "presetAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "setHook",
      "discriminator": [
        175,
        16,
        187,
        252,
        19,
        54,
        111,
        221
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "pair",
          "writable": true
        },
        {
          "name": "presetAuthority",
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "hook",
          "writable": true
        },
        {
          "name": "hooksProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "swap",
      "discriminator": [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      "accounts": [
        {
          "name": "pair",
          "writable": true,
          "relations": [
            "binArrayLower",
            "binArrayUpper"
          ]
        },
        {
          "name": "tokenMintX",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenMintY",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "userVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "tokenProgramX"
        },
        {
          "name": "tokenProgramY"
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "otherAmountThreshold",
          "type": "u64"
        },
        {
          "name": "swapForY",
          "type": "bool"
        },
        {
          "name": "swapType",
          "type": {
            "defined": {
              "name": "swapType"
            }
          }
        }
      ]
    },
    {
      "name": "transferConfigOwnership",
      "discriminator": [
        53,
        124,
        67,
        226,
        108,
        130,
        19,
        12
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig",
          "writable": true
        },
        {
          "name": "presetAuthority",
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "updateBinStepConfig",
      "discriminator": [
        205,
        204,
        206,
        220,
        251,
        239,
        19,
        238
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig",
          "relations": [
            "binStepConfig"
          ]
        },
        {
          "name": "binStepConfig",
          "writable": true
        },
        {
          "name": "presetAuthority",
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "status",
          "type": {
            "defined": {
              "name": "configStatus"
            }
          }
        },
        {
          "name": "availability",
          "type": {
            "defined": {
              "name": "configAvailability"
            }
          }
        },
        {
          "name": "feeParameters",
          "type": {
            "defined": {
              "name": "staticFeeParameters"
            }
          }
        }
      ]
    },
    {
      "name": "updatePairStaticFeeParameters",
      "discriminator": [
        20,
        223,
        186,
        73,
        199,
        65,
        45,
        80
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "pair",
          "writable": true
        },
        {
          "name": "presetAuthority",
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "feeParameters",
          "type": {
            "defined": {
              "name": "staticFeeParameters"
            }
          }
        }
      ]
    },
    {
      "name": "updateQuoteAssetBadge",
      "discriminator": [
        42,
        12,
        208,
        17,
        29,
        174,
        196,
        103
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig"
        },
        {
          "name": "quoteAssetBadge",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  95,
                  98,
                  97,
                  100,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "liquidityBookConfig"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "presetAuthority",
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "status",
          "type": {
            "defined": {
              "name": "quoteAssetBadgeStatus"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawProtocolFees",
      "discriminator": [
        11,
        68,
        165,
        98,
        18,
        208,
        134,
        73
      ],
      "accounts": [
        {
          "name": "liquidityBookConfig",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "pair",
          "writable": true
        },
        {
          "name": "tokenMintX",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenMintY",
          "relations": [
            "pair"
          ]
        },
        {
          "name": "tokenVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pair"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "protocolVaultX",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "presetAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgramX"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_x",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "protocolVaultY",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "presetAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgramY"
              },
              {
                "kind": "account",
                "path": "pair.token_mint_y",
                "account": "pair"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgramX"
        },
        {
          "name": "tokenProgramY"
        },
        {
          "name": "presetAuthority",
          "signer": true,
          "relations": [
            "liquidityBookConfig"
          ]
        },
        {
          "name": "memoProgram",
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "binArray",
      "discriminator": [
        92,
        142,
        92,
        220,
        5,
        148,
        70,
        181
      ]
    },
    {
      "name": "binStepConfig",
      "discriminator": [
        44,
        12,
        82,
        45,
        127,
        124,
        191,
        199
      ]
    },
    {
      "name": "liquidityBookConfig",
      "discriminator": [
        173,
        36,
        130,
        129,
        45,
        178,
        44,
        86
      ]
    },
    {
      "name": "pair",
      "discriminator": [
        85,
        72,
        49,
        176,
        182,
        228,
        141,
        82
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "quoteAssetBadge",
      "discriminator": [
        183,
        124,
        99,
        219,
        110,
        119,
        157,
        221
      ]
    }
  ],
  "events": [
    {
      "name": "binArrayInitializationEvent",
      "discriminator": [
        237,
        158,
        3,
        184,
        253,
        238,
        102,
        71
      ]
    },
    {
      "name": "binStepConfigInitializationEvent",
      "discriminator": [
        2,
        138,
        209,
        132,
        61,
        232,
        124,
        57
      ]
    },
    {
      "name": "binStepConfigUpdateEvent",
      "discriminator": [
        241,
        69,
        172,
        53,
        135,
        27,
        238,
        248
      ]
    },
    {
      "name": "binSwapEvent",
      "discriminator": [
        55,
        42,
        192,
        194,
        230,
        243,
        9,
        72
      ]
    },
    {
      "name": "compositionFeesEvent",
      "discriminator": [
        83,
        234,
        249,
        47,
        88,
        125,
        2,
        86
      ]
    },
    {
      "name": "liquidityBookConfigInitializationEvent",
      "discriminator": [
        90,
        99,
        66,
        116,
        24,
        72,
        145,
        146
      ]
    },
    {
      "name": "liquidityBookConfigTransferOwnershipEvent",
      "discriminator": [
        181,
        131,
        103,
        224,
        188,
        170,
        226,
        65
      ]
    },
    {
      "name": "liquidityBookConfigTransferOwnershipInitEvent",
      "discriminator": [
        69,
        165,
        109,
        99,
        223,
        38,
        229,
        100
      ]
    },
    {
      "name": "pairInitializationEvent",
      "discriminator": [
        132,
        133,
        209,
        222,
        229,
        215,
        206,
        245
      ]
    },
    {
      "name": "pairStaticFeeParametersUpdateEvent",
      "discriminator": [
        57,
        109,
        202,
        252,
        154,
        9,
        121,
        131
      ]
    },
    {
      "name": "positionCreationEvent",
      "discriminator": [
        97,
        21,
        205,
        201,
        62,
        41,
        111,
        164
      ]
    },
    {
      "name": "positionDecreaseEvent",
      "discriminator": [
        200,
        116,
        151,
        126,
        182,
        237,
        245,
        254
      ]
    },
    {
      "name": "positionIncreaseEvent",
      "discriminator": [
        247,
        40,
        58,
        113,
        28,
        175,
        60,
        174
      ]
    },
    {
      "name": "protocolFeesCollectionEvent",
      "discriminator": [
        196,
        36,
        190,
        66,
        172,
        52,
        142,
        15
      ]
    },
    {
      "name": "quoteAssetBadgeInitializationEvent",
      "discriminator": [
        202,
        110,
        93,
        186,
        165,
        96,
        200,
        27
      ]
    },
    {
      "name": "quoteAssetBadgeUpdateEvent",
      "discriminator": [
        102,
        149,
        171,
        236,
        123,
        73,
        205,
        194
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "binNotFound",
      "msg": "Bin not found within bin array"
    },
    {
      "code": 6001,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6002,
      "name": "invalidAmounts",
      "msg": "Invalid amounts length"
    },
    {
      "code": 6003,
      "name": "binArrayIndexMismatch",
      "msg": "Bin array index mismatch"
    },
    {
      "code": 6004,
      "name": "invalidAmountOut",
      "msg": "Invalid amount out"
    },
    {
      "code": 6005,
      "name": "invalidAmountIn",
      "msg": "Invalid amount in"
    },
    {
      "code": 6006,
      "name": "invalidDistribution",
      "msg": "Invalid distribution"
    },
    {
      "code": 6007,
      "name": "liquidityOverflow",
      "msg": "Liquidity overflow"
    },
    {
      "code": 6008,
      "name": "liquidityUnderflow",
      "msg": "Liquidity underflow"
    },
    {
      "code": 6009,
      "name": "zeroShares",
      "msg": "Zero shares"
    },
    {
      "code": 6010,
      "name": "notPositionOwner",
      "msg": "Not the owner of the position"
    },
    {
      "code": 6011,
      "name": "invalidStaticFeeParameters",
      "msg": "Invalid static fee parameters"
    },
    {
      "code": 6012,
      "name": "invalidConfig",
      "msg": "Invalid LB config provided"
    },
    {
      "code": 6013,
      "name": "pairPositionMismatch",
      "msg": "Pair and position mismatch"
    },
    {
      "code": 6014,
      "name": "pairLowerBinArrayMismatch",
      "msg": "Pair and lower bin array mismatch"
    },
    {
      "code": 6015,
      "name": "pairUpperBinArrayMismatch",
      "msg": "Pair and upper bin array mismatch"
    },
    {
      "code": 6016,
      "name": "inactiveBinStepConfig",
      "msg": "Inactive bin step config"
    },
    {
      "code": 6017,
      "name": "closedBinStepConfig",
      "msg": "Closed bin step config"
    },
    {
      "code": 6018,
      "name": "invalidQuoteAssetBadge",
      "msg": "Invalid quote asset badge provided"
    },
    {
      "code": 6019,
      "name": "transferFeeCalculationError",
      "msg": "Transfer fee calculation error"
    },
    {
      "code": 6020,
      "name": "getAmountOverflow",
      "msg": "Get amount overflow error"
    },
    {
      "code": 6021,
      "name": "amountOverflow",
      "msg": "Amount overflow error"
    },
    {
      "code": 6022,
      "name": "amountUnderflow",
      "msg": "Amount underflow error"
    },
    {
      "code": 6023,
      "name": "activeIdOverflow",
      "msg": "Active id overflow error"
    },
    {
      "code": 6024,
      "name": "activeIdUnderflow",
      "msg": "Active id overflow error"
    },
    {
      "code": 6025,
      "name": "invalidBinRange",
      "msg": "Invalid bin range"
    },
    {
      "code": 6026,
      "name": "pairTokenMismatch",
      "msg": "Pair Token Mismatch"
    },
    {
      "code": 6027,
      "name": "invalidHook",
      "msg": "Invalid Hook Provided"
    }
  ],
  "types": [
    {
      "name": "bin",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalSupply",
            "type": "u128"
          },
          {
            "name": "reserveX",
            "type": "u64"
          },
          {
            "name": "reserveY",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "binArray",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "bins",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "bin"
                  }
                },
                256
              ]
            }
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "space",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          }
        ]
      }
    },
    {
      "name": "binArrayInitializationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "binLiquidityDistribution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "relativeBinId",
            "type": "i32"
          },
          {
            "name": "distributionX",
            "type": "u16"
          },
          {
            "name": "distributionY",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "binStepConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "liquidityBookConfig",
            "type": "pubkey"
          },
          {
            "name": "binStep",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "configStatus"
              }
            }
          },
          {
            "name": "availability",
            "type": {
              "defined": {
                "name": "configAvailability"
              }
            }
          },
          {
            "name": "feeParameters",
            "type": {
              "defined": {
                "name": "staticFeeParameters"
              }
            }
          }
        ]
      }
    },
    {
      "name": "binStepConfigInitializationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidityBookConfig",
            "type": "pubkey"
          },
          {
            "name": "binStepConfig",
            "type": "pubkey"
          },
          {
            "name": "binStep",
            "type": "u8"
          },
          {
            "name": "feeParameters",
            "type": {
              "defined": {
                "name": "staticFeeParameters"
              }
            }
          }
        ]
      }
    },
    {
      "name": "binStepConfigUpdateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "binStepConfig",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "configStatus"
              }
            }
          },
          {
            "name": "availability",
            "type": {
              "defined": {
                "name": "configAvailability"
              }
            }
          },
          {
            "name": "feeParameters",
            "type": {
              "defined": {
                "name": "staticFeeParameters"
              }
            }
          }
        ]
      }
    },
    {
      "name": "binSwapEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "swapForY",
            "type": "bool"
          },
          {
            "name": "protocolFee",
            "type": "u64"
          },
          {
            "name": "binId",
            "type": "u32"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "volatilityAccumulator",
            "type": "u32"
          },
          {
            "name": "fee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "compositionFeesEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "activeId",
            "type": "u32"
          },
          {
            "name": "compositionFeesX",
            "type": "u64"
          },
          {
            "name": "compositionFeesY",
            "type": "u64"
          },
          {
            "name": "protocolFeesX",
            "type": "u64"
          },
          {
            "name": "protocolFeesY",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "configAvailability",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "closed"
          },
          {
            "name": "open"
          }
        ]
      }
    },
    {
      "name": "configStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "inactive"
          },
          {
            "name": "active"
          }
        ]
      }
    },
    {
      "name": "dynamicFeeParameters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timeLastUpdated",
            "type": "u64"
          },
          {
            "name": "volatilityAccumulator",
            "type": "u32"
          },
          {
            "name": "volatilityReference",
            "type": "u32"
          },
          {
            "name": "idReference",
            "type": "u32"
          },
          {
            "name": "space",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "liquidityBookConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "presetAuthority",
            "type": "pubkey"
          },
          {
            "name": "pendingPresetAuthority",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "liquidityBookConfigInitializationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "presetAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "liquidityBookConfigTransferOwnershipEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "liquidityBookConfigTransferOwnershipInitEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newPendingAuthority",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "pair",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "liquidityBookConfig",
            "type": "pubkey"
          },
          {
            "name": "binStep",
            "type": "u8"
          },
          {
            "name": "binStepSeed",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "tokenMintX",
            "type": "pubkey"
          },
          {
            "name": "tokenMintY",
            "type": "pubkey"
          },
          {
            "name": "staticFeeParameters",
            "type": {
              "defined": {
                "name": "staticFeeParameters"
              }
            }
          },
          {
            "name": "activeId",
            "type": "u32"
          },
          {
            "name": "dynamicFeeParameters",
            "type": {
              "defined": {
                "name": "dynamicFeeParameters"
              }
            }
          },
          {
            "name": "protocolFeesX",
            "type": "u64"
          },
          {
            "name": "protocolFeesY",
            "type": "u64"
          },
          {
            "name": "hook",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "pairInitializationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "tokenMintX",
            "type": "pubkey"
          },
          {
            "name": "tokenMintY",
            "type": "pubkey"
          },
          {
            "name": "binStepConfig",
            "type": "pubkey"
          },
          {
            "name": "activeId",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "pairStaticFeeParametersUpdateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "feeParameters",
            "type": {
              "defined": {
                "name": "staticFeeParameters"
              }
            }
          }
        ]
      }
    },
    {
      "name": "position",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "positionMint",
            "type": "pubkey"
          },
          {
            "name": "liquidityShares",
            "type": {
              "array": [
                "u128",
                64
              ]
            }
          },
          {
            "name": "lowerBinId",
            "type": "u32"
          },
          {
            "name": "upperBinId",
            "type": "u32"
          },
          {
            "name": "space",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "positionCreationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "positionMint",
            "type": "pubkey"
          },
          {
            "name": "lowerBinId",
            "type": "u32"
          },
          {
            "name": "upperBinId",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "positionDecreaseEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "binIds",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "amountsX",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "amountsY",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "liquidityBurned",
            "type": {
              "vec": "u128"
            }
          }
        ]
      }
    },
    {
      "name": "positionIncreaseEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "binIds",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "amountsX",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "amountsY",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "liquidityMinted",
            "type": {
              "vec": "u128"
            }
          }
        ]
      }
    },
    {
      "name": "protocolFeesCollectionEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pair",
            "type": "pubkey"
          },
          {
            "name": "protocolFeesX",
            "type": "u64"
          },
          {
            "name": "protocolFeesY",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "quoteAssetBadge",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "quoteAssetBadgeStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "quoteAssetBadgeInitializationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidityBookConfig",
            "type": "pubkey"
          },
          {
            "name": "quoteAssetBadge",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "quoteAssetBadgeStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "disabled"
          },
          {
            "name": "enabled"
          }
        ]
      }
    },
    {
      "name": "quoteAssetBadgeUpdateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "quoteAssetBadge",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "quoteAssetBadgeStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "staticFeeParameters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseFactor",
            "type": "u16"
          },
          {
            "name": "filterPeriod",
            "type": "u16"
          },
          {
            "name": "decayPeriod",
            "type": "u16"
          },
          {
            "name": "reductionFactor",
            "type": "u16"
          },
          {
            "name": "variableFeeControl",
            "type": "u32"
          },
          {
            "name": "maxVolatilityAccumulator",
            "type": "u32"
          },
          {
            "name": "protocolShare",
            "type": "u16"
          },
          {
            "name": "space",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "swapType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "exactInput"
          },
          {
            "name": "exactOutput"
          }
        ]
      }
    }
  ]
};
