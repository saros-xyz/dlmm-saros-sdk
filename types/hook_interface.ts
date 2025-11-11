/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/hook_interface.json`.
 */
export type HookInterface = {
  address: "hkif8yfVEYZGtnAgZeKgMC8m9H4Lgo4cGzB7Vn1AWtw";
  metadata: {
    name: "hookInterface";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "afterBurn";
      discriminator: [6, 153, 69, 120, 1, 248, 63, 0];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "binArrayLower";
          writable: true;
        },
        {
          name: "binArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "afterMint";
      discriminator: [134, 114, 182, 161, 82, 69, 14, 154];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "binArrayLower";
          writable: true;
        },
        {
          name: "binArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "afterSwap";
      discriminator: [235, 215, 232, 183, 152, 109, 5, 35];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "activeBinArrayLower";
          writable: true;
        },
        {
          name: "activeBinArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "afterTransfer";
      discriminator: [153, 128, 220, 5, 209, 90, 39, 89];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "activeBinArrayLower";
          writable: true;
        },
        {
          name: "activeBinArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "beforeBurn";
      discriminator: [7, 177, 19, 160, 28, 229, 57, 73];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "binArrayLower";
          writable: true;
        },
        {
          name: "binArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "beforeMint";
      discriminator: [67, 27, 57, 7, 28, 168, 109, 153];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "binArrayLower";
          writable: true;
        },
        {
          name: "binArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "beforeSwap";
      discriminator: [227, 59, 240, 68, 164, 9, 29, 254];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "activeBinArrayLower";
          writable: true;
        },
        {
          name: "activeBinArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "beforeTransfer";
      discriminator: [23, 118, 189, 23, 179, 222, 94, 146];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "activeBinArrayLower";
          writable: true;
        },
        {
          name: "activeBinArrayUpper";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: "onHookSet";
      discriminator: [23, 126, 214, 186, 197, 123, 0, 235];
      accounts: [
        {
          name: "pairAccount";
        },
        {
          name: "hook";
          writable: true;
        },
        {
          name: "pair";
          signer: true;
        },
      ];
      args: [];
    },
  ];
};
