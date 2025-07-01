import { Connection, PublicKey, Transaction, ComputeBudgetProgram, SystemProgram, TransactionMessage } from '@solana/web3.js';
import { AnchorProvider, Program, utils, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createSyncNativeInstruction, createCloseAccountInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Buffer as Buffer$1 } from 'buffer';
import cloneDeep from 'lodash-es/cloneDeep';
import bigDecimal from 'js-big-decimal';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function asyncGeneratorStep(n, t, e, r, o, a, c) {
  try {
    var i = n[a](c),
      u = i.value;
  } catch (n) {
    return void e(n);
  }
  i.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
  return function () {
    var t = this,
      e = arguments;
    return new Promise(function (r, o) {
      var a = n.apply(t, e);
      function _next(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
      }
      function _throw(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
      }
      _next(void 0);
    });
  };
}
function _construct(t, e, r) {
  if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments);
  var o = [null];
  o.push.apply(o, e);
  var p = new (t.bind.apply(t, o))();
  return r && _setPrototypeOf(p, r.prototype), p;
}
function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
    writable: !1
  }), e;
}
function _createForOfIteratorHelperLoose(r, e) {
  var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (t) return (t = t.call(r)).next.bind(t);
  if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) {
    t && (r = t);
    var o = 0;
    return function () {
      return o >= r.length ? {
        done: !0
      } : {
        done: !1,
        value: r[o++]
      };
    };
  }
  throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
function _getPrototypeOf(t) {
  return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) {
    return t.__proto__ || Object.getPrototypeOf(t);
  }, _getPrototypeOf(t);
}
function _inheritsLoose(t, o) {
  t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o);
}
function _isNativeFunction(t) {
  try {
    return -1 !== Function.toString.call(t).indexOf("[native code]");
  } catch (n) {
    return "function" == typeof t;
  }
}
function _isNativeReflectConstruct() {
  try {
    var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
  } catch (t) {}
  return (_isNativeReflectConstruct = function () {
    return !!t;
  })();
}
function _regenerator() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
  var e,
    t,
    r = "function" == typeof Symbol ? Symbol : {},
    n = r.iterator || "@@iterator",
    o = r.toStringTag || "@@toStringTag";
  function i(r, n, o, i) {
    var c = n && n.prototype instanceof Generator ? n : Generator,
      u = Object.create(c.prototype);
    return _regeneratorDefine(u, "_invoke", function (r, n, o) {
      var i,
        c,
        u,
        f = 0,
        p = o || [],
        y = !1,
        G = {
          p: 0,
          n: 0,
          v: e,
          a: d,
          f: d.bind(e, 4),
          d: function (t, r) {
            return i = t, c = 0, u = e, G.n = r, a;
          }
        };
      function d(r, n) {
        for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) {
          var o,
            i = p[t],
            d = G.p,
            l = i[2];
          r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0));
        }
        if (o || r > 1) return a;
        throw y = !0, n;
      }
      return function (o, p, l) {
        if (f > 1) throw TypeError("Generator is already running");
        for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) {
          i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u);
          try {
            if (f = 2, i) {
              if (c || (o = "next"), t = i[o]) {
                if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object");
                if (!t.done) return t;
                u = t.value, c < 2 && (c = 0);
              } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1);
              i = e;
            } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break;
          } catch (t) {
            i = e, c = 1, u = t;
          } finally {
            f = 1;
          }
        }
        return {
          value: t,
          done: y
        };
      };
    }(r, o, i), !0), u;
  }
  var a = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  t = Object.getPrototypeOf;
  var c = [][n] ? t(t([][n]())) : (_regeneratorDefine(t = {}, n, function () {
      return this;
    }), t),
    u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
  function f(e) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e;
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine(u), _regeneratorDefine(u, o, "Generator"), _regeneratorDefine(u, n, function () {
    return this;
  }), _regeneratorDefine(u, "toString", function () {
    return "[object Generator]";
  }), (_regenerator = function () {
    return {
      w: i,
      m: f
    };
  })();
}
function _regeneratorDefine(e, r, n, t) {
  var i = Object.defineProperty;
  try {
    i({}, "", {});
  } catch (e) {
    i = 0;
  }
  _regeneratorDefine = function (e, r, n, t) {
    if (r) i ? i(e, r, {
      value: n,
      enumerable: !t,
      configurable: !t,
      writable: !t
    }) : e[r] = n;else {
      function o(r, n) {
        _regeneratorDefine(e, r, function (e) {
          return this._invoke(r, n, e);
        });
      }
      o("next", 0), o("throw", 1), o("return", 2);
    }
  }, _regeneratorDefine(e, r, n, t);
}
function _regeneratorValues(e) {
  if (null != e) {
    var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"],
      r = 0;
    if (t) return t.call(e);
    if ("function" == typeof e.next) return e;
    if (!isNaN(e.length)) return {
      next: function () {
        return e && r >= e.length && (e = void 0), {
          value: e && e[r++],
          done: !e
        };
      }
    };
  }
  throw new TypeError(typeof e + " is not iterable");
}
function _setPrototypeOf(t, e) {
  return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) {
    return t.__proto__ = e, t;
  }, _setPrototypeOf(t, e);
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}
function _wrapNativeSuper(t) {
  var r = "function" == typeof Map ? new Map() : void 0;
  return _wrapNativeSuper = function (t) {
    if (null === t || !_isNativeFunction(t)) return t;
    if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function");
    if (void 0 !== r) {
      if (r.has(t)) return r.get(t);
      r.set(t, Wrapper);
    }
    function Wrapper() {
      return _construct(t, arguments, _getPrototypeOf(this).constructor);
    }
    return Wrapper.prototype = Object.create(t.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }), _setPrototypeOf(Wrapper, t);
  }, _wrapNativeSuper(t);
}

var MODE;
(function (MODE) {
  MODE["TESTNET"] = "testnet";
  MODE["DEVNET"] = "devnet";
  MODE["MAINNET"] = "mainnet";
})(MODE || (MODE = {}));

var _CONFIG;
var CONFIG = (_CONFIG = {}, _CONFIG[MODE.TESTNET] = {
  rpc: "https://api.testnet.solana.com"
}, _CONFIG[MODE.DEVNET] = {
  rpc: "https://api.devnet.solana.com"
}, _CONFIG[MODE.MAINNET] = {
  rpc: "https://api.mainnet-beta.solana.com"
}, _CONFIG);
var BASE_FACTOR = 8000;
var BIN_STEP = 1;
var ACTIVE_ID = 8388608;
var BIN_ARRAY_SIZE = 256;
var BIN_ARRAY_INDEX = ACTIVE_ID / BIN_ARRAY_SIZE - 1;
var MAX_BASIS_POINTS = 10000;
var FILTER_PERIOD = 30;
var DECAY_PERIOD = 600;
var REDUCTION_FACTOR = 5000;
var VARIABLE_FEE_CONTROL = 40000;
var MAX_VOLATILITY_ACCUMULATOR = 350000;
var PROTOCOL_SHARE = 2000;
var START_TIME = 1000;
var REWARDS_DURATION = 24 * 3600;
var REWARDS_PER_SECOND = /*#__PURE__*/Math.floor(100e9 / REWARDS_DURATION);
var VARIABLE_FEE_PRECISION = 100000000000;
var SCALE_OFFSET = 64;
var BASIS_POINT_MAX = 10000;
var ONE = 1 << SCALE_OFFSET;
var PRECISION = 1000000000;
var UNIT_PRICE_DEFAULT = 1000000;
var CCU_LIMIT = 400000;
var WRAP_SOL_ADDRESS = "So11111111111111111111111111111111111111112";
var FIXED_LENGTH = 16;
var BIN_STEP_CONFIGS = [{
  binStep: 1,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 10,
    decayPeriod: 120,
    reductionFactor: 5000,
    variableFeeControl: 2000000,
    maxVolatilityAccumulator: 100000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 2,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 10,
    decayPeriod: 120,
    reductionFactor: 5000,
    variableFeeControl: 500000,
    maxVolatilityAccumulator: 250000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 5,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 30,
    decayPeriod: 600,
    reductionFactor: 5000,
    variableFeeControl: 120000,
    maxVolatilityAccumulator: 300000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 10,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 30,
    decayPeriod: 600,
    reductionFactor: 5000,
    variableFeeControl: 40000,
    maxVolatilityAccumulator: 350000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 20,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 30,
    decayPeriod: 600,
    reductionFactor: 5000,
    variableFeeControl: 20000,
    maxVolatilityAccumulator: 350000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 50,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 120,
    decayPeriod: 1200,
    reductionFactor: 5000,
    variableFeeControl: 10000,
    maxVolatilityAccumulator: 250000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 100,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 300,
    decayPeriod: 1200,
    reductionFactor: 5000,
    variableFeeControl: 7500,
    maxVolatilityAccumulator: 150000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 200,
  feeParameters: {
    baseFactor: 10000,
    filterPeriod: 300,
    decayPeriod: 1200,
    reductionFactor: 5000,
    variableFeeControl: 7500,
    maxVolatilityAccumulator: 150000,
    protocolShare: 2000,
    space: [0, 0]
  }
}, {
  binStep: 250,
  feeParameters: {
    baseFactor: 20000,
    filterPeriod: 300,
    decayPeriod: 1200,
    reductionFactor: 5000,
    variableFeeControl: 7500,
    maxVolatilityAccumulator: 150000,
    protocolShare: 2000,
    space: [0, 0]
  }
}];

var address = "1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE";
var metadata = {
	name: "liquidity_book",
	version: "0.1.0",
	spec: "0.1.0",
	description: "Created with Anchor"
};
var instructions = [
	{
		name: "accept_config_ownership",
		discriminator: [
			6,
			212,
			14,
			48,
			229,
			38,
			62,
			241
		],
		accounts: [
			{
				name: "liquidity_book_config",
				writable: true
			},
			{
				name: "pending_preset_authority",
				signer: true
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
		]
	},
	{
		name: "close_position",
		discriminator: [
			123,
			134,
			81,
			0,
			49,
			68,
			98,
			98
		],
		accounts: [
			{
				name: "pair",
				writable: true,
				relations: [
					"position",
					"bin_array_lower",
					"bin_array_upper"
				]
			},
			{
				name: "position",
				writable: true
			},
			{
				name: "position_mint",
				writable: true
			},
			{
				name: "position_token_account",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "position_token_program"
						},
						{
							kind: "account",
							path: "position_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "bin_array_lower",
				writable: true
			},
			{
				name: "bin_array_upper",
				writable: true
			},
			{
				name: "token_mint_x",
				relations: [
					"pair"
				]
			},
			{
				name: "token_mint_y",
				relations: [
					"pair"
				]
			},
			{
				name: "token_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "token_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user",
				signer: true
			},
			{
				name: "token_program_x"
			},
			{
				name: "token_program_y"
			},
			{
				name: "position_token_program",
				address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "memo_program",
				address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
			},
			{
				name: "hook",
				writable: true,
				optional: true
			},
			{
				name: "hooks_program",
				optional: true
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
		]
	},
	{
		name: "create_position",
		discriminator: [
			48,
			215,
			197,
			153,
			96,
			203,
			180,
			133
		],
		accounts: [
			{
				name: "pair"
			},
			{
				name: "position",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "position_mint"
						}
					]
				}
			},
			{
				name: "position_mint",
				writable: true,
				signer: true
			},
			{
				name: "position_token_account",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program"
						},
						{
							kind: "account",
							path: "position_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "token_program",
				address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
			},
			{
				name: "associated_token_program",
				address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "relative_bin_id_left",
				type: "i32"
			},
			{
				name: "relative_bin_in_right",
				type: "i32"
			}
		]
	},
	{
		name: "decrease_position",
		discriminator: [
			57,
			125,
			21,
			59,
			200,
			137,
			179,
			108
		],
		accounts: [
			{
				name: "pair",
				writable: true,
				relations: [
					"position",
					"bin_array_lower",
					"bin_array_upper"
				]
			},
			{
				name: "position",
				writable: true
			},
			{
				name: "position_mint",
				writable: true
			},
			{
				name: "position_token_account",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "position_token_program"
						},
						{
							kind: "account",
							path: "position_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "bin_array_lower",
				writable: true
			},
			{
				name: "bin_array_upper",
				writable: true
			},
			{
				name: "token_mint_x",
				relations: [
					"pair"
				]
			},
			{
				name: "token_mint_y",
				relations: [
					"pair"
				]
			},
			{
				name: "token_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "token_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user",
				signer: true
			},
			{
				name: "token_program_x"
			},
			{
				name: "token_program_y"
			},
			{
				name: "position_token_program",
				address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "memo_program",
				address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
			},
			{
				name: "hook",
				writable: true,
				optional: true
			},
			{
				name: "hooks_program",
				optional: true
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "shares",
				type: {
					vec: "u128"
				}
			}
		]
	},
	{
		name: "increase_position",
		discriminator: [
			253,
			234,
			128,
			104,
			192,
			188,
			45,
			91
		],
		accounts: [
			{
				name: "pair",
				writable: true,
				relations: [
					"position",
					"bin_array_lower",
					"bin_array_upper"
				]
			},
			{
				name: "position",
				writable: true
			},
			{
				name: "position_mint",
				writable: true
			},
			{
				name: "position_token_account",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "position_token_program"
						},
						{
							kind: "account",
							path: "position_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "bin_array_lower",
				writable: true
			},
			{
				name: "bin_array_upper",
				writable: true
			},
			{
				name: "token_mint_x",
				relations: [
					"pair"
				]
			},
			{
				name: "token_mint_y",
				relations: [
					"pair"
				]
			},
			{
				name: "token_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "token_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user",
				signer: true
			},
			{
				name: "token_program_x"
			},
			{
				name: "token_program_y"
			},
			{
				name: "position_token_program",
				address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "memo_program",
				address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
			},
			{
				name: "hook",
				writable: true,
				optional: true
			},
			{
				name: "hooks_program",
				optional: true
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "amount_x",
				type: "u64"
			},
			{
				name: "amount_y",
				type: "u64"
			},
			{
				name: "liquidity_distribution",
				type: {
					vec: {
						defined: {
							name: "BinLiquidityDistribution"
						}
					}
				}
			}
		]
	},
	{
		name: "initialize_bin_array",
		discriminator: [
			35,
			86,
			19,
			185,
			78,
			212,
			75,
			211
		],
		accounts: [
			{
				name: "pair"
			},
			{
				name: "bin_array",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "pair"
						},
						{
							kind: "arg",
							path: "index"
						}
					]
				}
			},
			{
				name: "user",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "id",
				type: "u32"
			}
		]
	},
	{
		name: "initialize_bin_step_config",
		discriminator: [
			2,
			168,
			136,
			251,
			163,
			9,
			132,
			255
		],
		accounts: [
			{
				name: "liquidity_book_config"
			},
			{
				name: "bin_step_config",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "liquidity_book_config"
						},
						{
							kind: "arg",
							path: "bin_step"
						}
					]
				}
			},
			{
				name: "preset_authority",
				writable: true,
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "bin_step",
				type: "u8"
			},
			{
				name: "availability",
				type: {
					defined: {
						name: "ConfigAvailability"
					}
				}
			},
			{
				name: "fee_parameters",
				type: {
					defined: {
						name: "StaticFeeParameters"
					}
				}
			}
		]
	},
	{
		name: "initialize_config",
		discriminator: [
			208,
			127,
			21,
			1,
			194,
			190,
			196,
			70
		],
		accounts: [
			{
				name: "config",
				writable: true,
				signer: true
			},
			{
				name: "payer",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "fee_authority",
				type: "pubkey"
			}
		]
	},
	{
		name: "initialize_pair",
		discriminator: [
			177,
			114,
			226,
			34,
			186,
			150,
			5,
			245
		],
		accounts: [
			{
				name: "liquidity_book_config"
			},
			{
				name: "token_mint_x"
			},
			{
				name: "token_mint_y"
			},
			{
				name: "bin_step_config",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "liquidity_book_config"
						},
						{
							kind: "account",
							path: "bin_step_config.bin_step",
							account: "BinStepConfig"
						}
					]
				}
			},
			{
				name: "quote_asset_badge",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "liquidity_book_config"
						},
						{
							kind: "account",
							path: "token_mint_y"
						}
					]
				}
			},
			{
				name: "pair",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
								112,
								97,
								105,
								114
							]
						},
						{
							kind: "account",
							path: "liquidity_book_config"
						},
						{
							kind: "account",
							path: "token_mint_x"
						},
						{
							kind: "account",
							path: "token_mint_y"
						},
						{
							kind: "account",
							path: "bin_step_config.bin_step",
							account: "BinStepConfig"
						}
					]
				}
			},
			{
				name: "user",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "active_id",
				type: "u32"
			}
		]
	},
	{
		name: "initialize_quote_asset_badge",
		discriminator: [
			115,
			174,
			34,
			42,
			176,
			5,
			229,
			207
		],
		accounts: [
			{
				name: "liquidity_book_config"
			},
			{
				name: "quote_asset_badge",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "liquidity_book_config"
						},
						{
							kind: "account",
							path: "token_mint"
						}
					]
				}
			},
			{
				name: "token_mint"
			},
			{
				name: "preset_authority",
				writable: true,
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
		]
	},
	{
		name: "set_hook",
		discriminator: [
			175,
			16,
			187,
			252,
			19,
			54,
			111,
			221
		],
		accounts: [
			{
				name: "liquidity_book_config",
				relations: [
					"pair"
				]
			},
			{
				name: "pair",
				writable: true
			},
			{
				name: "preset_authority",
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "hook",
				writable: true
			},
			{
				name: "hooks_program"
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			}
		],
		args: [
		]
	},
	{
		name: "swap",
		discriminator: [
			248,
			198,
			158,
			145,
			225,
			117,
			135,
			200
		],
		accounts: [
			{
				name: "pair",
				writable: true,
				relations: [
					"bin_array_lower",
					"bin_array_upper"
				]
			},
			{
				name: "token_mint_x",
				relations: [
					"pair"
				]
			},
			{
				name: "token_mint_y",
				relations: [
					"pair"
				]
			},
			{
				name: "bin_array_lower",
				writable: true
			},
			{
				name: "bin_array_upper",
				writable: true
			},
			{
				name: "token_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "token_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "user",
				signer: true
			},
			{
				name: "token_program_x"
			},
			{
				name: "token_program_y"
			},
			{
				name: "memo_program",
				address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "amount",
				type: "u64"
			},
			{
				name: "other_amount_threshold",
				type: "u64"
			},
			{
				name: "swap_for_y",
				type: "bool"
			},
			{
				name: "swap_type",
				type: {
					defined: {
						name: "SwapType"
					}
				}
			}
		]
	},
	{
		name: "transfer_config_ownership",
		discriminator: [
			53,
			124,
			67,
			226,
			108,
			130,
			19,
			12
		],
		accounts: [
			{
				name: "liquidity_book_config",
				writable: true
			},
			{
				name: "preset_authority",
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "new_authority",
				type: {
					option: "pubkey"
				}
			}
		]
	},
	{
		name: "update_bin_step_config",
		discriminator: [
			205,
			204,
			206,
			220,
			251,
			239,
			19,
			238
		],
		accounts: [
			{
				name: "liquidity_book_config",
				relations: [
					"bin_step_config"
				]
			},
			{
				name: "bin_step_config",
				writable: true
			},
			{
				name: "preset_authority",
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "status",
				type: {
					defined: {
						name: "ConfigStatus"
					}
				}
			},
			{
				name: "availability",
				type: {
					defined: {
						name: "ConfigAvailability"
					}
				}
			},
			{
				name: "fee_parameters",
				type: {
					defined: {
						name: "StaticFeeParameters"
					}
				}
			}
		]
	},
	{
		name: "update_pair_static_fee_parameters",
		discriminator: [
			20,
			223,
			186,
			73,
			199,
			65,
			45,
			80
		],
		accounts: [
			{
				name: "liquidity_book_config",
				relations: [
					"pair"
				]
			},
			{
				name: "pair",
				writable: true
			},
			{
				name: "preset_authority",
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "fee_parameters",
				type: {
					defined: {
						name: "StaticFeeParameters"
					}
				}
			}
		]
	},
	{
		name: "update_quote_asset_badge",
		discriminator: [
			42,
			12,
			208,
			17,
			29,
			174,
			196,
			103
		],
		accounts: [
			{
				name: "liquidity_book_config"
			},
			{
				name: "quote_asset_badge",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "liquidity_book_config"
						},
						{
							kind: "account",
							path: "token_mint"
						}
					]
				}
			},
			{
				name: "token_mint"
			},
			{
				name: "preset_authority",
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "status",
				type: {
					defined: {
						name: "QuoteAssetBadgeStatus"
					}
				}
			}
		]
	},
	{
		name: "withdraw_protocol_fees",
		discriminator: [
			11,
			68,
			165,
			98,
			18,
			208,
			134,
			73
		],
		accounts: [
			{
				name: "liquidity_book_config",
				relations: [
					"pair"
				]
			},
			{
				name: "pair"
			},
			{
				name: "token_mint_x",
				relations: [
					"pair"
				]
			},
			{
				name: "token_mint_y",
				relations: [
					"pair"
				]
			},
			{
				name: "token_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "token_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "pair"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "protocol_vault_x",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "preset_authority"
						},
						{
							kind: "account",
							path: "token_program_x"
						},
						{
							kind: "account",
							path: "pair.token_mint_x",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "protocol_vault_y",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "preset_authority"
						},
						{
							kind: "account",
							path: "token_program_y"
						},
						{
							kind: "account",
							path: "pair.token_mint_y",
							account: "Pair"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "token_program_x"
			},
			{
				name: "token_program_y"
			},
			{
				name: "preset_authority",
				signer: true,
				relations: [
					"liquidity_book_config"
				]
			},
			{
				name: "memo_program",
				address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
		]
	}
];
var accounts = [
	{
		name: "BinArray",
		discriminator: [
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
		name: "BinStepConfig",
		discriminator: [
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
		name: "LiquidityBookConfig",
		discriminator: [
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
		name: "Pair",
		discriminator: [
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
		name: "Position",
		discriminator: [
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
		name: "QuoteAssetBadge",
		discriminator: [
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
];
var types = [
	{
		name: "Bin",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "total_supply",
					type: "u128"
				},
				{
					name: "reserve_x",
					type: "u64"
				},
				{
					name: "reserve_y",
					type: "u64"
				}
			]
		}
	},
	{
		name: "BinArray",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "bins",
					type: {
						array: [
							{
								defined: {
									name: "Bin"
								}
							},
							256
						]
					}
				},
				{
					name: "index",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							12
						]
					}
				}
			]
		}
	},
	{
		name: "BinArrayInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "index",
					type: "u32"
				}
			]
		}
	},
	{
		name: "BinLiquidityDistribution",
		type: {
			kind: "struct",
			fields: [
				{
					name: "relative_bin_id",
					type: "i32"
				},
				{
					name: "distribution_x",
					type: "u16"
				},
				{
					name: "distribution_y",
					type: "u16"
				}
			]
		}
	},
	{
		name: "BinStepConfig",
		type: {
			kind: "struct",
			fields: [
				{
					name: "bump",
					type: "u8"
				},
				{
					name: "liquidity_book_config",
					type: "pubkey"
				},
				{
					name: "bin_step",
					type: "u8"
				},
				{
					name: "status",
					type: {
						defined: {
							name: "ConfigStatus"
						}
					}
				},
				{
					name: "availability",
					type: {
						defined: {
							name: "ConfigAvailability"
						}
					}
				},
				{
					name: "fee_parameters",
					type: {
						defined: {
							name: "StaticFeeParameters"
						}
					}
				}
			]
		}
	},
	{
		name: "BinStepConfigInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "liquidity_book_config",
					type: "pubkey"
				},
				{
					name: "bin_step_config",
					type: "pubkey"
				},
				{
					name: "bin_step",
					type: "u8"
				},
				{
					name: "fee_parameters",
					type: {
						defined: {
							name: "StaticFeeParameters"
						}
					}
				}
			]
		}
	},
	{
		name: "BinStepConfigUpdateEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "bin_step_config",
					type: "pubkey"
				},
				{
					name: "status",
					type: {
						defined: {
							name: "ConfigStatus"
						}
					}
				},
				{
					name: "availability",
					type: {
						defined: {
							name: "ConfigAvailability"
						}
					}
				},
				{
					name: "fee_parameters",
					type: {
						defined: {
							name: "StaticFeeParameters"
						}
					}
				}
			]
		}
	},
	{
		name: "BinSwapEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "swap_for_y",
					type: "bool"
				},
				{
					name: "protocol_fee",
					type: "u64"
				},
				{
					name: "bin_id",
					type: "u32"
				},
				{
					name: "amount_in",
					type: "u64"
				},
				{
					name: "amount_out",
					type: "u64"
				},
				{
					name: "volatility_accumulator",
					type: "u32"
				},
				{
					name: "fee",
					type: "u64"
				}
			]
		}
	},
	{
		name: "CompositionFeesEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "active_id",
					type: "u32"
				},
				{
					name: "composition_fees_x",
					type: "u64"
				},
				{
					name: "composition_fees_y",
					type: "u64"
				},
				{
					name: "protocol_fees_x",
					type: "u64"
				},
				{
					name: "protocol_fees_y",
					type: "u64"
				}
			]
		}
	},
	{
		name: "ConfigAvailability",
		type: {
			kind: "enum",
			variants: [
				{
					name: "Closed"
				},
				{
					name: "Open"
				}
			]
		}
	},
	{
		name: "ConfigStatus",
		type: {
			kind: "enum",
			variants: [
				{
					name: "Inactive"
				},
				{
					name: "Active"
				}
			]
		}
	},
	{
		name: "DynamicFeeParameters",
		type: {
			kind: "struct",
			fields: [
				{
					name: "time_last_updated",
					type: "u64"
				},
				{
					name: "volatility_accumulator",
					type: "u32"
				},
				{
					name: "volatility_reference",
					type: "u32"
				},
				{
					name: "id_reference",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							4
						]
					}
				}
			]
		}
	},
	{
		name: "LiquidityBookConfig",
		type: {
			kind: "struct",
			fields: [
				{
					name: "preset_authority",
					type: "pubkey"
				},
				{
					name: "pending_preset_authority",
					type: {
						option: "pubkey"
					}
				}
			]
		}
	},
	{
		name: "LiquidityBookConfigInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "config",
					type: "pubkey"
				},
				{
					name: "preset_authority",
					type: "pubkey"
				}
			]
		}
	},
	{
		name: "LiquidityBookConfigTransferOwnershipEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "new_authority",
					type: "pubkey"
				}
			]
		}
	},
	{
		name: "LiquidityBookConfigTransferOwnershipInitEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "new_pending_authority",
					type: {
						option: "pubkey"
					}
				}
			]
		}
	},
	{
		name: "Pair",
		type: {
			kind: "struct",
			fields: [
				{
					name: "bump",
					type: {
						array: [
							"u8",
							1
						]
					}
				},
				{
					name: "liquidity_book_config",
					type: "pubkey"
				},
				{
					name: "bin_step",
					type: "u8"
				},
				{
					name: "bin_step_seed",
					type: {
						array: [
							"u8",
							1
						]
					}
				},
				{
					name: "token_mint_x",
					type: "pubkey"
				},
				{
					name: "token_mint_y",
					type: "pubkey"
				},
				{
					name: "static_fee_parameters",
					type: {
						defined: {
							name: "StaticFeeParameters"
						}
					}
				},
				{
					name: "active_id",
					type: "u32"
				},
				{
					name: "dynamic_fee_parameters",
					type: {
						defined: {
							name: "DynamicFeeParameters"
						}
					}
				},
				{
					name: "protocol_fees_x",
					type: "u64"
				},
				{
					name: "protocol_fees_y",
					type: "u64"
				},
				{
					name: "hook",
					type: {
						option: "pubkey"
					}
				}
			]
		}
	},
	{
		name: "PairInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "token_mint_x",
					type: "pubkey"
				},
				{
					name: "token_mint_y",
					type: "pubkey"
				},
				{
					name: "bin_step_config",
					type: "pubkey"
				},
				{
					name: "active_id",
					type: "u32"
				}
			]
		}
	},
	{
		name: "PairStaticFeeParametersUpdateEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "fee_parameters",
					type: {
						defined: {
							name: "StaticFeeParameters"
						}
					}
				}
			]
		}
	},
	{
		name: "Position",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "position_mint",
					type: "pubkey"
				},
				{
					name: "liquidity_shares",
					type: {
						array: [
							"u128",
							64
						]
					}
				},
				{
					name: "lower_bin_id",
					type: "u32"
				},
				{
					name: "upper_bin_id",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							8
						]
					}
				}
			]
		}
	},
	{
		name: "PositionCreationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "position",
					type: "pubkey"
				},
				{
					name: "position_mint",
					type: "pubkey"
				},
				{
					name: "lower_bin_id",
					type: "u32"
				},
				{
					name: "upper_bin_id",
					type: "u32"
				}
			]
		}
	},
	{
		name: "PositionDecreaseEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "position",
					type: "pubkey"
				},
				{
					name: "bin_ids",
					type: {
						vec: "u32"
					}
				},
				{
					name: "amounts_x",
					type: {
						vec: "u64"
					}
				},
				{
					name: "amounts_y",
					type: {
						vec: "u64"
					}
				},
				{
					name: "liquidity_burned",
					type: {
						vec: "u128"
					}
				}
			]
		}
	},
	{
		name: "PositionIncreaseEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "position",
					type: "pubkey"
				},
				{
					name: "bin_ids",
					type: {
						vec: "u32"
					}
				},
				{
					name: "amounts_x",
					type: {
						vec: "u64"
					}
				},
				{
					name: "amounts_y",
					type: {
						vec: "u64"
					}
				},
				{
					name: "liquidity_minted",
					type: {
						vec: "u128"
					}
				}
			]
		}
	},
	{
		name: "ProtocolFeesCollectionEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "protocol_fees_x",
					type: "u64"
				},
				{
					name: "protocol_fees_y",
					type: "u64"
				}
			]
		}
	},
	{
		name: "QuoteAssetBadge",
		type: {
			kind: "struct",
			fields: [
				{
					name: "bump",
					type: "u8"
				},
				{
					name: "status",
					type: {
						defined: {
							name: "QuoteAssetBadgeStatus"
						}
					}
				}
			]
		}
	},
	{
		name: "QuoteAssetBadgeInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "liquidity_book_config",
					type: "pubkey"
				},
				{
					name: "quote_asset_badge",
					type: "pubkey"
				},
				{
					name: "token_mint",
					type: "pubkey"
				}
			]
		}
	},
	{
		name: "QuoteAssetBadgeStatus",
		type: {
			kind: "enum",
			variants: [
				{
					name: "Disabled"
				},
				{
					name: "Enabled"
				}
			]
		}
	},
	{
		name: "QuoteAssetBadgeUpdateEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "quote_asset_badge",
					type: "pubkey"
				},
				{
					name: "status",
					type: {
						defined: {
							name: "QuoteAssetBadgeStatus"
						}
					}
				}
			]
		}
	},
	{
		name: "StaticFeeParameters",
		type: {
			kind: "struct",
			fields: [
				{
					name: "base_factor",
					type: "u16"
				},
				{
					name: "filter_period",
					type: "u16"
				},
				{
					name: "decay_period",
					type: "u16"
				},
				{
					name: "reduction_factor",
					type: "u16"
				},
				{
					name: "variable_fee_control",
					type: "u32"
				},
				{
					name: "max_volatility_accumulator",
					type: "u32"
				},
				{
					name: "protocol_share",
					type: "u16"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							2
						]
					}
				}
			]
		}
	},
	{
		name: "SwapType",
		type: {
			kind: "enum",
			variants: [
				{
					name: "ExactInput"
				},
				{
					name: "ExactOutput"
				}
			]
		}
	}
];
var LiquidityBookIDL = {
	address: address,
	metadata: metadata,
	instructions: instructions,
	accounts: accounts,
	types: types
};

var address$1 = "mdmavMvJpF4ZcLJNg6VSjuKVMiBo5uKwERTg1ZB9yUH";
var metadata$1 = {
	name: "mdma_hook",
	version: "0.1.0",
	spec: "0.1.0",
	description: "Created with Anchor"
};
var instructions$1 = [
	{
		name: "before_burn",
		discriminator: [
			7,
			177,
			19,
			160,
			28,
			229,
			57,
			73
		],
		accounts: [
			{
				name: "hook",
				writable: true,
				relations: [
					"active_bin_hook_bin_array_lower",
					"active_bin_hook_bin_array_upper",
					"position_hook_bin_array_lower",
					"position_hook_bin_array_upper"
				]
			},
			{
				name: "position"
			},
			{
				name: "pair",
				signer: true,
				relations: [
					"hook",
					"active_bin_array_lower",
					"active_bin_array_upper"
				]
			},
			{
				name: "pair_account"
			},
			{
				name: "active_bin_array_lower"
			},
			{
				name: "active_bin_array_upper"
			},
			{
				name: "active_bin_hook_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_upper",
				writable: true
			},
			{
				name: "hook_position",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "position"
						}
					]
				}
			},
			{
				name: "position_hook_bin_array_lower",
				writable: true
			},
			{
				name: "position_hook_bin_array_upper",
				writable: true
			}
		],
		args: [
		]
	},
	{
		name: "before_mint",
		discriminator: [
			67,
			27,
			57,
			7,
			28,
			168,
			109,
			153
		],
		accounts: [
			{
				name: "hook",
				writable: true,
				relations: [
					"active_bin_hook_bin_array_lower",
					"active_bin_hook_bin_array_upper",
					"position_hook_bin_array_lower",
					"position_hook_bin_array_upper"
				]
			},
			{
				name: "position"
			},
			{
				name: "pair",
				signer: true,
				relations: [
					"hook",
					"active_bin_array_lower",
					"active_bin_array_upper"
				]
			},
			{
				name: "pair_account"
			},
			{
				name: "active_bin_array_lower"
			},
			{
				name: "active_bin_array_upper"
			},
			{
				name: "active_bin_hook_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_upper",
				writable: true
			},
			{
				name: "hook_position",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "position"
						}
					]
				}
			},
			{
				name: "position_hook_bin_array_lower",
				writable: true
			},
			{
				name: "position_hook_bin_array_upper",
				writable: true
			}
		],
		args: [
		]
	},
	{
		name: "before_swap",
		discriminator: [
			227,
			59,
			240,
			68,
			164,
			9,
			29,
			254
		],
		accounts: [
			{
				name: "hook",
				writable: true,
				relations: [
					"active_bin_hook_bin_array_lower",
					"active_bin_hook_bin_array_upper"
				]
			},
			{
				name: "position"
			},
			{
				name: "pair",
				signer: true,
				relations: [
					"hook",
					"active_bin_array_lower",
					"active_bin_array_upper"
				]
			},
			{
				name: "pair_account"
			},
			{
				name: "active_bin_array_lower"
			},
			{
				name: "active_bin_array_upper"
			},
			{
				name: "active_bin_hook_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_upper",
				writable: true
			}
		],
		args: [
		]
	},
	{
		name: "claim",
		discriminator: [
			62,
			198,
			214,
			193,
			213,
			159,
			108,
			210
		],
		accounts: [
			{
				name: "hook",
				writable: true,
				relations: [
					"active_bin_hook_bin_array_lower",
					"active_bin_hook_bin_array_upper",
					"position_hook_bin_array_lower",
					"position_hook_bin_array_upper"
				]
			},
			{
				name: "position"
			},
			{
				name: "pair",
				relations: [
					"hook",
					"active_bin_array_lower",
					"active_bin_array_upper"
				]
			},
			{
				name: "active_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_array_upper",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_upper",
				writable: true
			},
			{
				name: "hook_position",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "position"
						}
					]
				}
			},
			{
				name: "position_hook_bin_array_lower",
				writable: true
			},
			{
				name: "position_hook_bin_array_upper",
				writable: true
			},
			{
				name: "reward_token_mint"
			},
			{
				name: "reward_token_vault",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "reward_token_program"
						},
						{
							kind: "account",
							path: "reward_token_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "reward_token_vault_user",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "user"
						},
						{
							kind: "account",
							path: "reward_token_program"
						},
						{
							kind: "account",
							path: "reward_token_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "reward_token_program"
			},
			{
				name: "user",
				signer: true
			},
			{
				name: "memo_program",
				address: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
			}
		],
		args: [
		]
	},
	{
		name: "initialize_bin_array",
		discriminator: [
			35,
			86,
			19,
			185,
			78,
			212,
			75,
			211
		],
		accounts: [
			{
				name: "hook"
			},
			{
				name: "bin_array",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "hook"
						},
						{
							kind: "arg",
							path: "index"
						}
					]
				}
			},
			{
				name: "user",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "index",
				type: "u32"
			}
		]
	},
	{
		name: "initialize_config",
		discriminator: [
			208,
			127,
			21,
			1,
			194,
			190,
			196,
			70
		],
		accounts: [
			{
				name: "config",
				writable: true,
				signer: true
			},
			{
				name: "payer",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "liquidity_book_program",
				type: "pubkey"
			},
			{
				name: "preset_authority",
				type: "pubkey"
			}
		]
	},
	{
		name: "initialize_hook",
		discriminator: [
			37,
			101,
			119,
			255,
			156,
			39,
			252,
			232
		],
		accounts: [
			{
				name: "config"
			},
			{
				name: "hook",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
								104,
								111,
								111,
								107
							]
						},
						{
							kind: "account",
							path: "config"
						},
						{
							kind: "arg",
							path: "pair"
						}
					]
				}
			},
			{
				name: "reward_token_mint"
			},
			{
				name: "reward_token_vault",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "reward_token_program"
						},
						{
							kind: "account",
							path: "reward_token_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "reward_token_vault_authority",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "hooks_authority"
						},
						{
							kind: "account",
							path: "reward_token_program"
						},
						{
							kind: "account",
							path: "reward_token_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "reward_token_program"
			},
			{
				name: "hooks_authority",
				writable: true,
				signer: true,
				relations: [
					"config"
				]
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "lb_pair",
				type: "pubkey"
			},
			{
				name: "rewards_per_second",
				type: "u64"
			},
			{
				name: "start_time",
				type: "i64"
			},
			{
				name: "duration",
				type: "i64"
			}
		]
	},
	{
		name: "initialize_position",
		discriminator: [
			219,
			192,
			234,
			71,
			190,
			191,
			102,
			80
		],
		accounts: [
			{
				name: "hook"
			},
			{
				name: "lb_position"
			},
			{
				name: "position",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "lb_position"
						}
					]
				}
			},
			{
				name: "user",
				writable: true,
				signer: true
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
		]
	},
	{
		name: "on_hook_set",
		discriminator: [
			23,
			126,
			214,
			186,
			197,
			123,
			0,
			235
		],
		accounts: [
			{
				name: "hook",
				writable: true
			},
			{
				name: "pair",
				signer: true,
				relations: [
					"hook"
				]
			}
		],
		args: [
		]
	},
	{
		name: "set_rewards_parameters",
		discriminator: [
			86,
			145,
			230,
			205,
			136,
			137,
			140,
			193
		],
		accounts: [
			{
				name: "config"
			},
			{
				name: "hook",
				writable: true,
				relations: [
					"active_bin_hook_bin_array_lower",
					"active_bin_hook_bin_array_upper"
				]
			},
			{
				name: "pair",
				relations: [
					"hook",
					"active_bin_array_lower",
					"active_bin_array_upper"
				]
			},
			{
				name: "active_bin_array_lower"
			},
			{
				name: "active_bin_array_upper"
			},
			{
				name: "active_bin_hook_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_upper",
				writable: true
			},
			{
				name: "reward_token_mint",
				relations: [
					"hook"
				]
			},
			{
				name: "reward_token_vault",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "reward_token_program"
						},
						{
							kind: "account",
							path: "reward_token_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "reward_token_program"
			},
			{
				name: "hooks_authority",
				signer: true,
				relations: [
					"config"
				]
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "rewards_per_second",
				type: "u64"
			},
			{
				name: "start_time",
				type: "i64"
			},
			{
				name: "duration",
				type: "i64"
			}
		]
	},
	{
		name: "set_rewards_per_second",
		discriminator: [
			77,
			81,
			53,
			27,
			248,
			29,
			133,
			203
		],
		accounts: [
			{
				name: "config"
			},
			{
				name: "hook",
				writable: true,
				relations: [
					"active_bin_hook_bin_array_lower",
					"active_bin_hook_bin_array_upper"
				]
			},
			{
				name: "pair",
				relations: [
					"hook",
					"active_bin_array_lower",
					"active_bin_array_upper"
				]
			},
			{
				name: "active_bin_array_lower"
			},
			{
				name: "active_bin_array_upper"
			},
			{
				name: "active_bin_hook_bin_array_lower",
				writable: true
			},
			{
				name: "active_bin_hook_bin_array_upper",
				writable: true
			},
			{
				name: "reward_token_mint",
				relations: [
					"hook"
				]
			},
			{
				name: "reward_token_vault",
				writable: true,
				pda: {
					seeds: [
						{
							kind: "account",
							path: "hook"
						},
						{
							kind: "account",
							path: "reward_token_program"
						},
						{
							kind: "account",
							path: "reward_token_mint"
						}
					],
					program: {
						kind: "const",
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
							89
						]
					}
				}
			},
			{
				name: "reward_token_program"
			},
			{
				name: "hooks_authority",
				signer: true,
				relations: [
					"config"
				]
			},
			{
				name: "system_program",
				address: "11111111111111111111111111111111"
			},
			{
				name: "event_authority",
				pda: {
					seeds: [
						{
							kind: "const",
							value: [
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
				name: "program"
			}
		],
		args: [
			{
				name: "rewards_per_second",
				type: "u64"
			},
			{
				name: "duration",
				type: "i64"
			}
		]
	}
];
var accounts$1 = [
	{
		name: "BinArray",
		discriminator: [
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
		name: "Hook",
		discriminator: [
			125,
			61,
			76,
			173,
			200,
			161,
			92,
			217
		]
	},
	{
		name: "HookBinArray",
		discriminator: [
			103,
			134,
			57,
			58,
			74,
			234,
			9,
			157
		]
	},
	{
		name: "HookPosition",
		discriminator: [
			125,
			149,
			132,
			62,
			52,
			71,
			211,
			143
		]
	},
	{
		name: "HooksConfig",
		discriminator: [
			221,
			108,
			154,
			235,
			72,
			117,
			10,
			9
		]
	},
	{
		name: "Pair",
		discriminator: [
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
		name: "Position",
		discriminator: [
			170,
			188,
			143,
			228,
			122,
			64,
			247,
			208
		]
	}
];
var events = [
	{
		name: "HookInitializationEvent",
		discriminator: [
			229,
			217,
			175,
			38,
			112,
			240,
			117,
			95
		]
	},
	{
		name: "HookUpdateEvent",
		discriminator: [
			66,
			73,
			183,
			141,
			138,
			243,
			187,
			99
		]
	},
	{
		name: "HooksConfigInitializationEvent",
		discriminator: [
			0,
			32,
			252,
			233,
			70,
			49,
			186,
			150
		]
	}
];
var errors = [
	{
		code: 6000,
		name: "CheckedAddSignedOverflow",
		msg: "Checked add signed overflow"
	},
	{
		code: 6001,
		name: "CheckedAddOverflow",
		msg: "Checked add overflow"
	},
	{
		code: 6002,
		name: "HookBinArrayIndexMismatch",
		msg: "Hook bin array index mismatch"
	},
	{
		code: 6003,
		name: "BinNotFound",
		msg: "Bin not found"
	},
	{
		code: 6004,
		name: "ShlDivError",
		msg: "Shift left division error"
	},
	{
		code: 6005,
		name: "MulDivError",
		msg: "Mul div error"
	},
	{
		code: 6006,
		name: "MulShrError",
		msg: "Mul shr error"
	},
	{
		code: 6007,
		name: "CheckedMulOverflow",
		msg: "Checked Mul overflow"
	},
	{
		code: 6008,
		name: "InvalidStartTime",
		msg: "Invalid start time"
	},
	{
		code: 6009,
		name: "CheckedSubUnderflow",
		msg: "Checked sub underflow"
	},
	{
		code: 6010,
		name: "ZeroRewards",
		msg: "Rewarder won't distribute any rewards"
	}
];
var types$1 = [
	{
		name: "Bin",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "total_supply",
					type: "u128"
				},
				{
					name: "reserve_x",
					type: "u64"
				},
				{
					name: "reserve_y",
					type: "u64"
				}
			]
		}
	},
	{
		name: "BinArray",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "bins",
					type: {
						array: [
							{
								defined: {
									name: "Bin"
								}
							},
							256
						]
					}
				},
				{
					name: "index",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							12
						]
					}
				}
			]
		}
	},
	{
		name: "DynamicFeeParameters",
		type: {
			kind: "struct",
			fields: [
				{
					name: "time_last_updated",
					type: "u64"
				},
				{
					name: "volatility_accumulator",
					type: "u32"
				},
				{
					name: "volatility_reference",
					type: "u32"
				},
				{
					name: "id_reference",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							4
						]
					}
				}
			]
		}
	},
	{
		name: "Hook",
		type: {
			kind: "struct",
			fields: [
				{
					name: "bump",
					type: {
						array: [
							"u8",
							1
						]
					}
				},
				{
					name: "config",
					type: "pubkey"
				},
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "reward_token_mint",
					type: "pubkey"
				},
				{
					name: "rewards_per_second",
					type: "u64"
				},
				{
					name: "end_time",
					type: "i64"
				},
				{
					name: "last_update",
					type: "i64"
				},
				{
					name: "delta_bin_a",
					type: "i32"
				},
				{
					name: "delta_bin_b",
					type: "i32"
				},
				{
					name: "total_unclaimed_rewards",
					type: "u64"
				}
			]
		}
	},
	{
		name: "HookBinArray",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "hook",
					type: "pubkey"
				},
				{
					name: "index",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							28
						]
					}
				},
				{
					name: "accrued_rewards_per_share",
					type: {
						array: [
							"u128",
							256
						]
					}
				}
			]
		}
	},
	{
		name: "HookInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "config",
					type: "pubkey"
				},
				{
					name: "pair",
					type: "pubkey"
				}
			]
		}
	},
	{
		name: "HookPosition",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "user_accrued_rewards_per_share",
					type: {
						array: [
							"u128",
							64
						]
					}
				},
				{
					name: "pending_rewards",
					type: "u64"
				},
				{
					name: "bump",
					type: "u8"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							7
						]
					}
				}
			]
		}
	},
	{
		name: "HookUpdateEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "hook",
					type: "pubkey"
				},
				{
					name: "rewards_per_second",
					type: "u64"
				}
			]
		}
	},
	{
		name: "HooksConfig",
		type: {
			kind: "struct",
			fields: [
				{
					name: "liquidity_book_program",
					type: "pubkey"
				},
				{
					name: "hooks_authority",
					type: "pubkey"
				}
			]
		}
	},
	{
		name: "HooksConfigInitializationEvent",
		type: {
			kind: "struct",
			fields: [
				{
					name: "config",
					type: "pubkey"
				},
				{
					name: "liquidity_book_program",
					type: "pubkey"
				},
				{
					name: "preset_authority",
					type: "pubkey"
				}
			]
		}
	},
	{
		name: "Pair",
		type: {
			kind: "struct",
			fields: [
				{
					name: "bump",
					type: {
						array: [
							"u8",
							1
						]
					}
				},
				{
					name: "liquidity_book_config",
					type: "pubkey"
				},
				{
					name: "bin_step",
					type: "u8"
				},
				{
					name: "bin_step_seed",
					type: {
						array: [
							"u8",
							1
						]
					}
				},
				{
					name: "token_mint_x",
					type: "pubkey"
				},
				{
					name: "token_mint_y",
					type: "pubkey"
				},
				{
					name: "static_fee_parameters",
					type: {
						defined: {
							name: "StaticFeeParameters"
						}
					}
				},
				{
					name: "active_id",
					type: "u32"
				},
				{
					name: "dynamic_fee_parameters",
					type: {
						defined: {
							name: "DynamicFeeParameters"
						}
					}
				},
				{
					name: "protocol_fees_x",
					type: "u64"
				},
				{
					name: "protocol_fees_y",
					type: "u64"
				},
				{
					name: "hook",
					type: {
						option: "pubkey"
					}
				}
			]
		}
	},
	{
		name: "Position",
		serialization: "bytemuck",
		repr: {
			kind: "c"
		},
		type: {
			kind: "struct",
			fields: [
				{
					name: "pair",
					type: "pubkey"
				},
				{
					name: "position_mint",
					type: "pubkey"
				},
				{
					name: "liquidity_shares",
					type: {
						array: [
							"u128",
							64
						]
					}
				},
				{
					name: "lower_bin_id",
					type: "u32"
				},
				{
					name: "upper_bin_id",
					type: "u32"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							8
						]
					}
				}
			]
		}
	},
	{
		name: "StaticFeeParameters",
		type: {
			kind: "struct",
			fields: [
				{
					name: "base_factor",
					type: "u16"
				},
				{
					name: "filter_period",
					type: "u16"
				},
				{
					name: "decay_period",
					type: "u16"
				},
				{
					name: "reduction_factor",
					type: "u16"
				},
				{
					name: "variable_fee_control",
					type: "u32"
				},
				{
					name: "max_volatility_accumulator",
					type: "u32"
				},
				{
					name: "protocol_share",
					type: "u16"
				},
				{
					name: "_space",
					type: {
						array: [
							"u8",
							2
						]
					}
				}
			]
		}
	}
];
var MdmaIDL = {
	address: address$1,
	metadata: metadata$1,
	instructions: instructions$1,
	accounts: accounts$1,
	events: events,
	errors: errors,
	types: types$1
};

var LiquidityBookAbstract = function LiquidityBookAbstract(config) {
  var _config$options;
  // Initialize the services heref
  this.connection = new Connection(((_config$options = config.options) == null ? void 0 : _config$options.rpcUrl) || CONFIG[config.mode].rpc, {
    commitment: "confirmed",
    httpHeaders: {
      development: "coin98"
    }
  });
  var provider = new AnchorProvider(this.connection, window.solana, AnchorProvider.defaultOptions());
  this.lbProgram = new Program(LiquidityBookIDL, provider);
  this.hooksProgram = new Program(MdmaIDL, provider);
};

var getProgram = /*#__PURE__*/function () {
  var _ref = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(address, connection) {
    var _account$value;
    var account, owner, program;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return connection.getParsedAccountInfo(address);
        case 1:
          account = _context.v;
          owner = (_account$value = account.value) == null ? void 0 : _account$value.owner.toBase58();
          program = owner === TOKEN_PROGRAM_ID.toBase58() ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
          return _context.a(2, program);
      }
    }, _callee);
  }));
  return function getProgram(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var getBase = function getBase(binStep) {
  var quotient = binStep << SCALE_OFFSET;
  if (quotient < 0) return null;
  var basisPointMaxBigInt = BASIS_POINT_MAX;
  var fraction = quotient / basisPointMaxBigInt;
  var oneBigInt = ONE;
  var result = oneBigInt + fraction;
  return result;
};
var getPriceFromId = function getPriceFromId(bin_step, bin_id, baseTokenDecimal, quoteTokenDecimal) {
  var base = getBase(bin_step);
  var exponent = bin_id - 8388608;
  var decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal);
  return Math.pow(base, exponent) * decimalPow;
};
var getIdFromPrice = function getIdFromPrice(price, binStep, baseTokenDecimal, quoteTokenDecimal) {
  if (price <= 0) throw new Error('Giá phải lớn hơn 0');
  if (binStep <= 0 || binStep > BASIS_POINT_MAX) throw new Error('Bin step invalid');
  var decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal);
  var base = 1 + binStep / BASIS_POINT_MAX;
  var exponent = Math.log(price * decimalPow) / Math.log(base);
  var binId = Math.round(exponent + 8388608);
  return binId;
};

var LBError = /*#__PURE__*/function (_Error) {
  function LBError(message) {
    var _this;
    _this = _Error.call(this, message) || this;
    _this.name = "LBError";
    return _this;
  }
  _inheritsLoose(LBError, _Error);
  return LBError;
}(/*#__PURE__*/_wrapNativeSuper(Error));
LBError.BinNotFound = /*#__PURE__*/new LBError("Bin not found");
LBError.BinArrayIndexMismatch = /*#__PURE__*/new LBError("Bin array index mismatch");
var BinArrayRange = /*#__PURE__*/function () {
  function BinArrayRange(binArrayPrevious, binArrayCurrent, binArrayNext) {
    var _this2 = this;
    if (binArrayCurrent.index !== binArrayPrevious.index + 1 || binArrayNext.index !== binArrayCurrent.index + 1) {
      throw LBError.BinArrayIndexMismatch;
    }
    this.bins = {};
    var addBins = function addBins(binArray) {
      binArray.bins.forEach(function (bin, index) {
        var binId = binArray.index * BIN_ARRAY_SIZE + index;
        _this2.bins[binId] = bin;
      });
    };
    addBins(binArrayPrevious);
    addBins(binArrayCurrent);
    addBins(binArrayNext);
  }
  var _proto = BinArrayRange.prototype;
  _proto.getBinMut = function getBinMut(binId) {
    var bin = this.bins[binId];
    return bin;
  };
  _proto.getAllBins = function getAllBins() {
    return Object.values(this.bins);
  };
  return BinArrayRange;
}();
var LBSwapService = /*#__PURE__*/function () {
  function LBSwapService(lbProgram, connection) {
    this.lbProgram = lbProgram;
    this.connection = connection;
    this.volatilityAccumulator = 0;
    this.volatilityReference = 0;
    this.referenceId = 0;
    this.timeLastUpdated = 0;
  }
  LBSwapService.fromLbConfig = function fromLbConfig(lbProgram, connection) {
    return new LBSwapService(lbProgram, connection);
  };
  var _proto2 = LBSwapService.prototype;
  _proto2.getBinArray = function getBinArray(params) {
    var binArrayIndex = params.binArrayIndex,
      pair = params.pair;
    var binArray = PublicKey.findProgramAddressSync([Buffer.from(utils.bytes.utf8.encode("bin_array")), pair.toBuffer(), new BN(binArrayIndex).toArrayLike(Buffer, "le", 4)], this.lbProgram.programId)[0];
    return binArray;
  };
  _proto2.calculateInOutAmount = /*#__PURE__*/function () {
    var _calculateInOutAmount = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(params) {
      var _this3 = this;
      var amount, swapForY, pair, isExactInput, pairInfo, currentBinArrayIndex, binArrayIndexes, binArrayAddresses, binArrays, binRange, totalSupply, amountAfterTransferFee, amountOut, amountIn, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            amount = params.amount, swapForY = params.swapForY, pair = params.pair, isExactInput = params.isExactInput;
            _context.p = 1;
            _context.n = 2;
            return this.lbProgram.account.pair.fetch(pair);
          case 2:
            pairInfo = _context.v;
            if (pairInfo) {
              _context.n = 3;
              break;
            }
            throw new Error("Pair not found");
          case 3:
            currentBinArrayIndex = Math.floor(pairInfo.activeId / BIN_ARRAY_SIZE);
            binArrayIndexes = [currentBinArrayIndex - 1, currentBinArrayIndex, currentBinArrayIndex + 1];
            binArrayAddresses = binArrayIndexes.map(function (idx) {
              return _this3.getBinArray({
                binArrayIndex: idx,
                pair: pair
              });
            }); // Fetch bin arrays in batch, fallback to empty if not found
            _context.n = 4;
            return Promise.all(binArrayAddresses.map(function (address, i) {
              return (
                //@ts-ignore
                _this3.lbProgram.account.binArray.fetch(address)["catch"](function (error) {
                  return {
                    index: binArrayIndexes[i],
                    bins: []
                  };
                })
              );
            }));
          case 4:
            binArrays = _context.v;
            // Validate bin arrays and build range
            binRange = new BinArrayRange(binArrays[0], binArrays[1], binArrays[2]);
            totalSupply = binRange.getAllBins().reduce(function (acc, cur) {
              return acc.add(cur.totalSupply);
            }, new BN(0));
            if (!totalSupply.isZero()) {
              _context.n = 5;
              break;
            }
            return _context.a(2, {
              amountIn: BigInt(0),
              amountOut: BigInt(0)
            });
          case 5:
            amountAfterTransferFee = amount;
            if (!isExactInput) {
              _context.n = 7;
              break;
            }
            _context.n = 6;
            return this.calculateAmountOut(amountAfterTransferFee, binRange, pairInfo, swapForY);
          case 6:
            amountOut = _context.v;
            return _context.a(2, {
              amountIn: amount,
              amountOut: amountOut
            });
          case 7:
            _context.n = 8;
            return this.calculateAmountIn(amountAfterTransferFee, binRange, pairInfo, swapForY);
          case 8:
            amountIn = _context.v;
            return _context.a(2, {
              amountIn: amountIn,
              amountOut: amountAfterTransferFee
            });
          case 9:
            _context.n = 11;
            break;
          case 10:
            _context.p = 10;
            _t = _context.v;
            throw new Error(_t);
          case 11:
            return _context.a(2);
        }
      }, _callee, this, [[1, 10]]);
    }));
    function calculateInOutAmount(_x) {
      return _calculateInOutAmount.apply(this, arguments);
    }
    return calculateInOutAmount;
  }()
  /**
   * @description Calculate the input amount for the swap. isExactInput = false
   */
  ;
  _proto2.calculateAmountIn =
  /*#__PURE__*/
  function () {
    var _calculateAmountIn = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(amount, bins, pairInfo, swapForY) {
      var amountIn, totalProtocolFee, amountOutLeft, activeId, activeBin, fee, _this$swapExactOutput, amountInWithFees, amountOutOfBin, protocolFeeAmount;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            amountIn = BigInt(0);
            totalProtocolFee = BigInt(0);
            amountOutLeft = amount;
            activeId = pairInfo.activeId;
            _context2.n = 1;
            return this.updateReferences(pairInfo, activeId);
          case 1:
            if (!(amountOutLeft > BigInt(0))) {
              _context2.n = 4;
              break;
            }
            this.updateVolatilityAccumulator(pairInfo, activeId);
            activeBin = bins.getBinMut(activeId);
            if (activeBin) {
              _context2.n = 2;
              break;
            }
            return _context2.a(3, 4);
          case 2:
            fee = this.getTotalFee(pairInfo);
            _this$swapExactOutput = this.swapExactOutput({
              binStep: pairInfo.binStep,
              activeId: activeId,
              amountOutLeft: amountOutLeft,
              fee: fee,
              protocolShare: pairInfo.staticFeeParameters.protocolShare,
              swapForY: swapForY,
              reserveX: activeBin.reserveX,
              reserveY: activeBin.reserveY
            }), amountInWithFees = _this$swapExactOutput.amountInWithFees, amountOutOfBin = _this$swapExactOutput.amountOut, protocolFeeAmount = _this$swapExactOutput.protocolFeeAmount;
            amountIn += amountInWithFees;
            amountOutLeft -= amountOutOfBin;
            totalProtocolFee += protocolFeeAmount;
            if (amountOutLeft) {
              _context2.n = 3;
              break;
            }
            return _context2.a(3, 4);
          case 3:
            activeId = this.moveActiveId(activeId, swapForY);
            _context2.n = 1;
            break;
          case 4:
            return _context2.a(2, amountIn);
        }
      }, _callee2, this);
    }));
    function calculateAmountIn(_x2, _x3, _x4, _x5) {
      return _calculateAmountIn.apply(this, arguments);
    }
    return calculateAmountIn;
  }()
  /**
   * @description Calculate the output amount for the swap. isExactInput = true
   */
  ;
  _proto2.calculateAmountOut =
  /*#__PURE__*/
  function () {
    var _calculateAmountOut = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(amount, bins, pairInfo, swapForY) {
      var amountOut, totalProtocolFee, amountInLeft, activeId, activeBin, fee, _this$swapExactInput, amountInWithFees, amountOutOfBin, protocolFeeAmount, _t2;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.p = 0;
            amountOut = BigInt(0);
            totalProtocolFee = BigInt(0);
            amountInLeft = amount;
            activeId = pairInfo.activeId;
            _context3.n = 1;
            return this.updateReferences(pairInfo, activeId);
          case 1:
            if (!(amountInLeft > BigInt(0))) {
              _context3.n = 4;
              break;
            }
            this.updateVolatilityAccumulator(pairInfo, activeId);
            activeBin = bins.getBinMut(activeId);
            if (activeBin) {
              _context3.n = 2;
              break;
            }
            return _context3.a(3, 4);
          case 2:
            fee = this.getTotalFee(pairInfo);
            _this$swapExactInput = this.swapExactInput({
              binStep: pairInfo.binStep,
              activeId: activeId,
              amountInLeft: amountInLeft,
              fee: fee,
              protocolShare: pairInfo.staticFeeParameters.protocolShare,
              swapForY: swapForY,
              reserveX: activeBin.reserveX,
              reserveY: activeBin.reserveY
            }), amountInWithFees = _this$swapExactInput.amountInWithFees, amountOutOfBin = _this$swapExactInput.amountOut, protocolFeeAmount = _this$swapExactInput.protocolFeeAmount;
            amountOut += amountOutOfBin;
            amountInLeft -= amountInWithFees;
            totalProtocolFee += protocolFeeAmount;
            if (amountInLeft) {
              _context3.n = 3;
              break;
            }
            return _context3.a(3, 4);
          case 3:
            activeId = this.moveActiveId(activeId, swapForY);
            _context3.n = 1;
            break;
          case 4:
            return _context3.a(2, amountOut);
          case 5:
            _context3.p = 5;
            _t2 = _context3.v;
            throw new Error(_t2);
          case 6:
            return _context3.a(2);
        }
      }, _callee3, this, [[0, 5]]);
    }));
    function calculateAmountOut(_x6, _x7, _x8, _x9) {
      return _calculateAmountOut.apply(this, arguments);
    }
    return calculateAmountOut;
  }();
  _proto2.swapExactOutput = function swapExactOutput(params) {
    var binStep = params.binStep,
      activeId = params.activeId,
      amountOutLeft = params.amountOutLeft,
      protocolShare = params.protocolShare,
      swapForY = params.swapForY,
      reserveX = params.reserveX,
      reserveY = params.reserveY,
      fee = params.fee;
    var protocolShareBigInt = BigInt(protocolShare);
    var binReserveOut = swapForY ? reserveY : reserveX;
    if (binReserveOut.isZero()) {
      return {
        amountInWithFees: BigInt(0),
        amountOut: BigInt(0),
        feeAmount: BigInt(0),
        protocolFeeAmount: BigInt(0)
      };
    }
    var binReserveOutBigInt = BigInt(binReserveOut.toString());
    var amountOut = amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;
    /** @notice assume base token and quote token have the same decimals to get the price */
    var price = getPriceFromId(binStep, activeId, 9, 9);
    // Encode price as bigint with SCALE_OFFSET
    var priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));
    var amountInWithoutFee = this.calcAmountInByPrice(amountOut, priceScaled, SCALE_OFFSET, swapForY, "up");
    var feeAmount = this.getFeeForAmount(amountInWithoutFee, fee);
    var amountIn = amountInWithoutFee + feeAmount;
    var protocolFeeAmount = this.getProtocolFee(feeAmount, protocolShareBigInt);
    return {
      amountInWithFees: amountIn,
      amountOut: amountOut,
      feeAmount: feeAmount,
      protocolFeeAmount: protocolFeeAmount
    };
  };
  _proto2.swapExactInput = function swapExactInput(params) {
    var binStep = params.binStep,
      activeId = params.activeId,
      amountInLeft = params.amountInLeft,
      protocolShare = params.protocolShare,
      swapForY = params.swapForY,
      reserveX = params.reserveX,
      reserveY = params.reserveY,
      fee = params.fee;
    var protocolShareBigInt = BigInt(protocolShare);
    var binReserveOut = swapForY ? reserveY : reserveX;
    if (binReserveOut.isZero()) {
      return {
        amountInWithFees: BigInt(0),
        amountOut: BigInt(0),
        feeAmount: BigInt(0),
        protocolFeeAmount: BigInt(0)
      };
    }
    var binReserveOutBigInt = BigInt(binReserveOut.toString());
    /** @notice assume base token and quote token have the same decimals to get the price */
    var price = getPriceFromId(binStep, activeId, 9, 9);
    // Encode price as bigint with SCALE_OFFSET
    var priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));
    // Calculate maxAmountIn (input needed to take all output in bin, before fee)
    var maxAmountIn = this.calcAmountInByPrice(binReserveOutBigInt, priceScaled, SCALE_OFFSET, swapForY, "up");
    // Add fee to get total input needed (ceil)
    var maxFeeAmount = this.getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;
    var amountOut = BigInt(0);
    var amountIn = BigInt(0);
    var feeAmount = BigInt(0);
    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = this.getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = this.calcAmountOutByPrice(amountIn, priceScaled, SCALE_OFFSET, swapForY, "down");
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }
    var protocolFeeAmount = protocolShare > BigInt(0) ? this.getProtocolFee(feeAmount, protocolShareBigInt) : BigInt(0);
    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut: amountOut,
      feeAmount: feeAmount,
      protocolFeeAmount: protocolFeeAmount
    };
  };
  _proto2.updateReferences = /*#__PURE__*/function () {
    var _updateReferences = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(pairInfo, activeId) {
      var slot, blockTimeStamp, timeDelta;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            this.referenceId = pairInfo.dynamicFeeParameters.idReference;
            this.timeLastUpdated = pairInfo.dynamicFeeParameters.timeLastUpdated.toNumber();
            this.volatilityReference = pairInfo.dynamicFeeParameters.volatilityReference;
            _context4.n = 1;
            return this.connection.getSlot();
          case 1:
            slot = _context4.v;
            _context4.n = 2;
            return this.connection.getBlockTime(slot);
          case 2:
            blockTimeStamp = _context4.v;
            if (!blockTimeStamp) {
              _context4.n = 5;
              break;
            }
            timeDelta = blockTimeStamp - this.timeLastUpdated;
            if (!(timeDelta > pairInfo.staticFeeParameters.filterPeriod)) {
              _context4.n = 4;
              break;
            }
            this.referenceId = activeId;
            if (!(timeDelta >= pairInfo.staticFeeParameters.decayPeriod)) {
              _context4.n = 3;
              break;
            }
            this.volatilityReference = 0;
            _context4.n = 4;
            break;
          case 3:
            return _context4.a(2, this.updateVolatilityReference(pairInfo));
          case 4:
            this.timeLastUpdated = blockTimeStamp;
          case 5:
            return _context4.a(2, this.updateVolatilityAccumulator(pairInfo, activeId));
        }
      }, _callee4, this);
    }));
    function updateReferences(_x0, _x1) {
      return _updateReferences.apply(this, arguments);
    }
    return updateReferences;
  }();
  _proto2.updateVolatilityReference = function updateVolatilityReference(pairInfo) {
    this.volatilityReference = pairInfo.dynamicFeeParameters.volatilityAccumulator * pairInfo.staticFeeParameters.reductionFactor / 10000;
  };
  _proto2.updateVolatilityAccumulator = function updateVolatilityAccumulator(pairInfo, activeId) {
    var deltaId = Math.abs(activeId - this.referenceId);
    var volatilityAccumulator = deltaId * 10000 + this.volatilityReference;
    var maxVolatilityAccumulator = pairInfo.staticFeeParameters.maxVolatilityAccumulator;
    if (volatilityAccumulator > maxVolatilityAccumulator) {
      this.volatilityAccumulator = maxVolatilityAccumulator;
    } else {
      this.volatilityAccumulator = volatilityAccumulator;
    }
  };
  _proto2.getVariableFee = function getVariableFee(pairInfo) {
    var variableFeeControl = BigInt(pairInfo.staticFeeParameters.variableFeeControl);
    if (variableFeeControl > BigInt(0)) {
      var prod = BigInt(Math.floor(this.volatilityAccumulator * pairInfo.binStep));
      var variableFee = (prod * prod * variableFeeControl + BigInt(VARIABLE_FEE_PRECISION) - BigInt(1)) / BigInt(VARIABLE_FEE_PRECISION);
      return variableFee;
    }
    return variableFeeControl;
  };
  _proto2.getBaseFee = function getBaseFee(binStep, baseFactor) {
    return BigInt(binStep) * BigInt(baseFactor) * BigInt(10);
  };
  _proto2.getFeeForAmount = function getFeeForAmount(amount, fee) {
    var denominator = BigInt(PRECISION) - fee;
    var feeForAmount = (amount * fee + denominator - BigInt(1)) / denominator;
    return feeForAmount;
  };
  _proto2.getFeeAmount = function getFeeAmount(amount, fee) {
    var feeAmount = (amount * fee + BigInt(PRECISION) - BigInt(1)) / BigInt(PRECISION);
    return feeAmount;
  };
  _proto2.getProtocolFee = function getProtocolFee(fee, protocolShare) {
    var protocolFee = fee * protocolShare / BigInt(BASIS_POINT_MAX);
    return protocolFee;
  };
  _proto2.getTotalFee = function getTotalFee(pairInfo) {
    return this.getBaseFee(pairInfo.binStep, pairInfo.staticFeeParameters.baseFactor) + this.getVariableFee(pairInfo);
  };
  _proto2.moveActiveId = function moveActiveId(pairId, swapForY) {
    if (swapForY) {
      return pairId - 1;
    } else {
      return pairId + 1;
    }
  }
  /**
   * Calculates the input amount required for a swap based on the desired output amount and price.
   *
   * @param amountOut - The desired output amount as a bigint.
   * @param priceScaled - The scaled price as a bigint.
   * @param scaleOffset - The scaling factor used for price adjustments.
   * @param swapForY - A boolean indicating the direction of the swap
   * @param rounding - Specifies the rounding mode
   * @returns The calculated input amount as a bigint.
   */;
  _proto2.calcAmountInByPrice = function calcAmountInByPrice(amountOut, priceScaled, scaleOffset, swapForY, rounding) {
    if (swapForY) {
      // amountIn = (amountOut << scaleOffset) / priceScaled
      return rounding === "up" ? ((amountOut << BigInt(scaleOffset)) + priceScaled - BigInt(1)) / priceScaled : (amountOut << BigInt(scaleOffset)) / priceScaled;
    } else {
      // amountIn = (amountOut * priceScaled) >> scaleOffset
      return rounding === "up" ? amountOut * priceScaled + (BigInt(1) << BigInt(scaleOffset)) - BigInt(1) >> BigInt(scaleOffset) : amountOut * priceScaled >> BigInt(scaleOffset);
    }
  }
  /**
   * Calculates the output amount based on the input amount, price, and scaling factors.
   *
   * @param amountIn - The input amount as a bigint.
   * @param priceScaled - The scaled price as a bigint.
   * @param scaleOffset - The scaling offset as a number, used to adjust the precision.
   * @param swapForY - A boolean indicating the direction of the swap
   * @param rounding - The rounding mode to apply when calculating the output amount
   * @returns The calculated output amount as a bigint.
   */;
  _proto2.calcAmountOutByPrice = function calcAmountOutByPrice(amountIn, priceScaled, scaleOffset, swapForY, rounding) {
    if (swapForY) {
      // price = (Y / X) & swapForY => amountOut = amountIn * price
      // amountOut = (amountIn * priceScaled) >> scaleOffset
      return rounding === "up" ? amountIn * priceScaled + (BigInt(1) << BigInt(scaleOffset)) - BigInt(1) >> BigInt(scaleOffset) : amountIn * priceScaled >> BigInt(scaleOffset);
    } else {
      // price = (X / Y) & !swapForY => amountOut = amountIn / price
      // amountOut = (amountIn << scaleOffset) / priceScaled
      return rounding === "up" ? ((amountIn << BigInt(scaleOffset)) + priceScaled - BigInt(1)) / priceScaled : (amountIn << BigInt(scaleOffset)) / priceScaled;
    }
  };
  return LBSwapService;
}();

var divRem = function divRem(numerator, denominator) {
  if (denominator === 0) {
    throw new Error('Division by zero'); // Xử lý lỗi chia cho 0
  }
  // Tính thương và phần dư
  var quotient = numerator / denominator; // Thương
  var remainder = numerator % denominator; // Phần dư
  return [quotient, remainder]; // Trả về mảng chứa thương và phần dư
};
/// (x * y) / denominator
var mulDiv = function mulDiv(x, y, denominator, rounding) {
  var prod = x * y;
  if (rounding === 'up') {
    return Math.floor((prod + denominator - 1) / denominator);
  }
  if (rounding === 'down') {
    var _divRem = divRem(prod, denominator),
      quotient = _divRem[0];
    return quotient;
  }
};
var mulShr = function mulShr(x, y, offset, rounding) {
  var denominator = 1 << offset;
  return mulDiv(x, y, denominator, rounding);
};
// (x << offset) / y
var shlDiv = function shlDiv(x, y, offset, rounding) {
  var scale = 1 << offset;
  return mulDiv(x, scale, y, rounding);
};

var LiquidityShape;
(function (LiquidityShape) {
  LiquidityShape["Spot"] = "Spot";
  LiquidityShape["Curve"] = "Curve";
  LiquidityShape["BidAsk"] = "BidAsk";
})(LiquidityShape || (LiquidityShape = {}));
var RemoveLiquidityType;
(function (RemoveLiquidityType) {
  RemoveLiquidityType["Both"] = "removeBoth";
  RemoveLiquidityType["BaseToken"] = "removeBaseToken";
  RemoveLiquidityType["QuoteToken"] = "removeQuoteToken";
})(RemoveLiquidityType || (RemoveLiquidityType = {}));

var getGasPrice = /*#__PURE__*/function () {
  var _ref = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(connection) {
    var buffNum;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          buffNum = 100;
          _context2.p = 1;
          _context2.n = 2;
          return new Promise(/*#__PURE__*/function () {
            var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(resolve) {
              var timeout, getPriority, currentFee, unitPrice;
              return _regenerator().w(function (_context) {
                while (1) switch (_context.n) {
                  case 0:
                    timeout = setTimeout(function () {
                      resolve(UNIT_PRICE_DEFAULT * buffNum);
                    }, 2000);
                    _context.n = 1;
                    return connection.getRecentPrioritizationFees();
                  case 1:
                    getPriority = _context.v;
                    currentFee = getPriority.filter(function (fee) {
                      return (fee == null ? void 0 : fee.prioritizationFee) > 0;
                    }).map(function (fee) {
                      return fee == null ? void 0 : fee.prioritizationFee;
                    });
                    clearTimeout(timeout);
                    unitPrice = currentFee.length > 0 ? Math.max.apply(Math, currentFee.concat([UNIT_PRICE_DEFAULT])) : UNIT_PRICE_DEFAULT;
                    resolve(unitPrice * buffNum);
                  case 2:
                    return _context.a(2);
                }
              }, _callee);
            }));
            return function (_x2) {
              return _ref2.apply(this, arguments);
            };
          }());
        case 2:
          return _context2.a(2, _context2.v);
        case 3:
          _context2.p = 3;
          return _context2.a(2, UNIT_PRICE_DEFAULT * buffNum);
      }
    }, _callee2, null, [[1, 3]]);
  }));
  return function getGasPrice(_x) {
    return _ref.apply(this, arguments);
  };
}();

var LiquidityBookServices = /*#__PURE__*/function (_LiquidityBookAbstrac) {
  function LiquidityBookServices(config) {
    return _LiquidityBookAbstrac.call(this, config) || this;
  }
  _inheritsLoose(LiquidityBookServices, _LiquidityBookAbstrac);
  var _proto = LiquidityBookServices.prototype;
  _proto.getPairAccount = /*#__PURE__*/function () {
    var _getPairAccount = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(pair) {
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return this.lbProgram.account.pair.fetch(pair);
          case 1:
            return _context.a(2, _context.v);
        }
      }, _callee, this);
    }));
    function getPairAccount(_x) {
      return _getPairAccount.apply(this, arguments);
    }
    return getPairAccount;
  }();
  _proto.getPositionAccount = /*#__PURE__*/function () {
    var _getPositionAccount = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(position) {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return this.lbProgram.account.position.fetch(position);
          case 1:
            return _context2.a(2, _context2.v);
        }
      }, _callee2, this);
    }));
    function getPositionAccount(_x2) {
      return _getPositionAccount.apply(this, arguments);
    }
    return getPositionAccount;
  }();
  _proto.getBinArray = /*#__PURE__*/function () {
    var _getBinArray = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(params) {
      var binArrayIndex, pair, payer, transaction, binArray, binArrayInfo, initializebinArrayConfigTx;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            binArrayIndex = params.binArrayIndex, pair = params.pair, payer = params.payer, transaction = params.transaction;
            binArray = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), pair.toBuffer(), new BN(binArrayIndex).toArrayLike(Buffer$1, "le", 4)], this.lbProgram.programId)[0];
            if (!(transaction && payer)) {
              _context3.n = 3;
              break;
            }
            _context3.n = 1;
            return this.connection.getAccountInfo(binArray);
          case 1:
            binArrayInfo = _context3.v;
            if (binArrayInfo) {
              _context3.n = 3;
              break;
            }
            _context3.n = 2;
            return this.lbProgram.methods.initializeBinArray(binArrayIndex).accountsPartial({
              pair: pair,
              binArray: binArray,
              user: payer
            }).instruction();
          case 2:
            initializebinArrayConfigTx = _context3.v;
            transaction.add(initializebinArrayConfigTx);
          case 3:
            return _context3.a(2, binArray);
        }
      }, _callee3, this);
    }));
    function getBinArray(_x3) {
      return _getBinArray.apply(this, arguments);
    }
    return getBinArray;
  }();
  _proto.getBinArrayInfo = /*#__PURE__*/function () {
    var _getBinArrayInfo = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(params) {
      var binArrayIndex, pair, payer, resultIndex, result, binArray, _yield$this$lbProgram, bins, binArrayOther, res, _binArrayOther, _res;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            binArrayIndex = params.binArrayIndex, pair = params.pair, payer = params.payer;
            resultIndex = binArrayIndex;
            result = [];
            _context4.n = 1;
            return this.getBinArray({
              binArrayIndex: binArrayIndex,
              pair: pair,
              payer: payer
            });
          case 1:
            binArray = _context4.v;
            _context4.n = 2;
            return this.lbProgram.account.binArray.fetch(binArray);
          case 2:
            _yield$this$lbProgram = _context4.v;
            bins = _yield$this$lbProgram.bins;
            _context4.p = 3;
            _context4.n = 4;
            return this.getBinArray({
              binArrayIndex: binArrayIndex + 1,
              pair: pair,
              payer: payer
            });
          case 4:
            binArrayOther = _context4.v;
            _context4.n = 5;
            return this.lbProgram.account.binArray.fetch(binArrayOther);
          case 5:
            res = _context4.v;
            result = [].concat(bins, res.bins);
            _context4.n = 9;
            break;
          case 6:
            _context4.p = 6;
            _context4.n = 7;
            return this.getBinArray({
              binArrayIndex: binArrayIndex - 1,
              pair: pair,
              payer: payer
            });
          case 7:
            _binArrayOther = _context4.v;
            _context4.n = 8;
            return this.lbProgram.account.binArray.fetch(_binArrayOther);
          case 8:
            _res = _context4.v;
            result = [].concat(_res.bins, bins);
            resultIndex -= 1;
          case 9:
            return _context4.a(2, {
              bins: result,
              resultIndex: resultIndex
            });
        }
      }, _callee4, this, [[3, 6]]);
    }));
    function getBinArrayInfo(_x4) {
      return _getBinArrayInfo.apply(this, arguments);
    }
    return getBinArrayInfo;
  }();
  _proto.getBinsReserveInformation = /*#__PURE__*/function () {
    var _getBinsReserveInformation = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(params) {
      var position, pair, payer, positionInfo, firstBinId, binArrayIndex, _yield$this$getBinArr, bins, resultIndex, firstBinIndex, binIds, reserveXY;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            position = params.position, pair = params.pair, payer = params.payer;
            _context5.n = 1;
            return this.getPositionAccount(position);
          case 1:
            positionInfo = _context5.v;
            firstBinId = positionInfo.lowerBinId;
            binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);
            _context5.n = 2;
            return this.getBinArrayInfo({
              binArrayIndex: binArrayIndex,
              pair: pair,
              payer: payer
            });
          case 2:
            _yield$this$getBinArr = _context5.v;
            bins = _yield$this$getBinArr.bins;
            resultIndex = _yield$this$getBinArr.resultIndex;
            firstBinIndex = resultIndex * BIN_ARRAY_SIZE;
            binIds = Array.from({
              length: positionInfo.upperBinId - firstBinId + 1
            }, function (_, i) {
              return firstBinId - firstBinIndex + i;
            });
            reserveXY = binIds.map(function (binId, index) {
              var liquidityShare = positionInfo.liquidityShares[index].toString();
              var activeBin = bins[binId];
              if (activeBin) {
                var totalReserveX = +BigInt(activeBin.reserveX).toString();
                var totalReserveY = +BigInt(activeBin.reserveY).toString();
                var totalSupply = +BigInt(activeBin.totalSupply).toString();
                var reserveX = Number(totalReserveX) > 0 ? mulDiv(Number(liquidityShare), Number(totalReserveX), Number(totalSupply), "down") : 0;
                var reserveY = Number(totalReserveY) > 0 ? mulDiv(Number(liquidityShare), Number(totalReserveY), Number(totalSupply), "down") : 0;
                return {
                  reserveX: reserveX || 0,
                  reserveY: reserveY || 0,
                  totalSupply: +BigInt(activeBin.totalSupply).toString(),
                  binId: firstBinId + index,
                  binPosistion: binId,
                  liquidityShare: positionInfo.liquidityShares[index]
                };
              }
              return {
                reserveX: 0,
                reserveY: 0,
                totalSupply: "0",
                binId: firstBinId + index,
                binPosistion: binId,
                liquidityShare: liquidityShare
              };
            });
            return _context5.a(2, reserveXY);
        }
      }, _callee5, this);
    }));
    function getBinsReserveInformation(_x5) {
      return _getBinsReserveInformation.apply(this, arguments);
    }
    return getBinsReserveInformation;
  }();
  _proto.createPairWithConfig = /*#__PURE__*/function () {
    var _createPairWithConfig = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(params) {
      var tokenBase, tokenQuote, binStep, ratePrice, payer, tokenX, tokenY, id, binArrayIndex, tx, binStepConfig, quoteAssetBadge, pair, initializePairConfigTx, binArrayLower, binArrayUpper, initializeBinArrayLowerConfigTx, initializeBinArrayUpperConfigTx;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            tokenBase = params.tokenBase, tokenQuote = params.tokenQuote, binStep = params.binStep, ratePrice = params.ratePrice, payer = params.payer;
            tokenX = new PublicKey(tokenBase.mintAddress);
            tokenY = new PublicKey(tokenQuote.mintAddress);
            id = getIdFromPrice(ratePrice || 1, binStep, tokenBase.decimal, tokenQuote.decimal);
            binArrayIndex = id / BIN_ARRAY_SIZE;
            if (id % BIN_ARRAY_SIZE < BIN_ARRAY_SIZE / 2) {
              binArrayIndex -= 1;
            }
            tx = new Transaction();
            binStepConfig = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_step_config")), this.lbConfig.toBuffer(), new Uint8Array([binStep])], this.lbProgram.programId)[0];
            quoteAssetBadge = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("quote_asset_badge")), this.lbConfig.toBuffer(), tokenY.toBuffer()], this.lbProgram.programId)[0];
            pair = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("pair")), this.lbConfig.toBuffer(), tokenX.toBuffer(), tokenY.toBuffer(), new Uint8Array([binStep])], this.lbProgram.programId)[0];
            _context6.n = 1;
            return this.lbProgram.methods.initializePair(id).accountsPartial({
              liquidityBookConfig: this.lbConfig,
              binStepConfig: binStepConfig,
              quoteAssetBadge: quoteAssetBadge,
              pair: pair,
              tokenMintX: tokenX,
              tokenMintY: tokenY,
              user: payer
            }).instruction();
          case 1:
            initializePairConfigTx = _context6.v;
            tx.add(initializePairConfigTx);
            binArrayLower = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), pair.toBuffer(), new BN(binArrayIndex).toArrayLike(Buffer$1, "le", 4)], this.lbProgram.programId)[0];
            binArrayUpper = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), pair.toBuffer(), new BN(Number(binArrayIndex) + 1).toArrayLike(Buffer$1, "le", 4)], this.lbProgram.programId)[0];
            _context6.n = 2;
            return this.lbProgram.methods.initializeBinArray(binArrayIndex).accountsPartial({
              pair: pair,
              binArray: binArrayLower,
              user: payer
            }).instruction();
          case 2:
            initializeBinArrayLowerConfigTx = _context6.v;
            tx.add(initializeBinArrayLowerConfigTx);
            _context6.n = 3;
            return this.lbProgram.methods.initializeBinArray(new BN(binArrayIndex + 1)).accountsPartial({
              pair: pair,
              binArray: binArrayUpper,
              user: payer
            }).instruction();
          case 3:
            initializeBinArrayUpperConfigTx = _context6.v;
            tx.add(initializeBinArrayUpperConfigTx);
            return _context6.a(2, {
              tx: tx,
              pair: pair.toString(),
              binArrayLower: binArrayLower.toString(),
              binArrayUpper: binArrayUpper.toString(),
              hooksConfig: this.hooksConfig.toString(),
              activeBin: Number(id)
            });
        }
      }, _callee6, this);
    }));
    function createPairWithConfig(_x6) {
      return _createPairWithConfig.apply(this, arguments);
    }
    return createPairWithConfig;
  }();
  _proto.createPosition = /*#__PURE__*/function () {
    var _createPosition = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(params) {
      var payer, relativeBinIdLeft, relativeBinIdRight, pair, binArrayIndex, positionMint, transaction, position, positionVault, initializePositionTx;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            payer = params.payer, relativeBinIdLeft = params.relativeBinIdLeft, relativeBinIdRight = params.relativeBinIdRight, pair = params.pair, binArrayIndex = params.binArrayIndex, positionMint = params.positionMint, transaction = params.transaction;
            position = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("position")), positionMint.toBuffer()], this.lbProgram.programId)[0];
            positionVault = getAssociatedTokenAddressSync(positionMint, payer, true, TOKEN_2022_PROGRAM_ID);
            _context7.n = 1;
            return this.getBinArray({
              binArrayIndex: binArrayIndex,
              pair: pair,
              payer: payer
            });
          case 1:
            _context7.n = 2;
            return this.getBinArray({
              binArrayIndex: binArrayIndex + 1,
              pair: pair,
              payer: payer
            });
          case 2:
            _context7.n = 3;
            return this.lbProgram.methods.createPosition(new BN(relativeBinIdLeft), new BN(relativeBinIdRight)).accountsPartial({
              pair: pair,
              position: position,
              positionMint: positionMint,
              positionTokenAccount: positionVault,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
              user: payer
            }).instruction();
          case 3:
            initializePositionTx = _context7.v;
            transaction.add(initializePositionTx);
            return _context7.a(2, {
              position: position.toString()
            });
        }
      }, _callee7, this);
    }));
    function createPosition(_x7) {
      return _createPosition.apply(this, arguments);
    }
    return createPosition;
  }();
  _proto.addLiquidityIntoPosition = /*#__PURE__*/function () {
    var _addLiquidityIntoPosition = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(params) {
      var _Number, _this$bufferGas;
      var positionMint, payer, pair, binArrayLower, binArrayUpper, transaction, liquidityDistribution, amountX, amountY, pairInfo, tokenProgramX, tokenProgramY, associatedPairVaultX, associatedPairVaultY, associatedUserVaultX, associatedUserVaultY, isNativeY, totalAmount, totalLiquid, amount, associatedUserVault, unitSPrice, unitPrice, hook, position, positionVault, addLiquidityInstructions;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            positionMint = params.positionMint, payer = params.payer, pair = params.pair, binArrayLower = params.binArrayLower, binArrayUpper = params.binArrayUpper, transaction = params.transaction, liquidityDistribution = params.liquidityDistribution, amountX = params.amountX, amountY = params.amountY;
            _context8.n = 1;
            return this.getPairAccount(pair);
          case 1:
            pairInfo = _context8.v;
            _context8.n = 2;
            return getProgram(pairInfo.tokenMintX, this.connection);
          case 2:
            tokenProgramX = _context8.v;
            _context8.n = 3;
            return getProgram(pairInfo.tokenMintY, this.connection);
          case 3:
            tokenProgramY = _context8.v;
            _context8.n = 4;
            return this.getPairVaultInfo({
              tokenAddress: pairInfo.tokenMintX,
              pair: pair
            });
          case 4:
            associatedPairVaultX = _context8.v;
            _context8.n = 5;
            return this.getPairVaultInfo({
              tokenAddress: pairInfo.tokenMintY,
              pair: pair
            });
          case 5:
            associatedPairVaultY = _context8.v;
            _context8.n = 6;
            return this.getUserVaultInfo({
              tokenAddress: pairInfo.tokenMintX,
              payer: payer
            });
          case 6:
            associatedUserVaultX = _context8.v;
            _context8.n = 7;
            return this.getUserVaultInfo({
              tokenAddress: pairInfo.tokenMintY,
              payer: payer
            });
          case 7:
            associatedUserVaultY = _context8.v;
            if (pairInfo.tokenMintY.toString() === WRAP_SOL_ADDRESS || pairInfo.tokenMintX.toString() === WRAP_SOL_ADDRESS) {
              isNativeY = pairInfo.tokenMintY.toString() === WRAP_SOL_ADDRESS;
              totalAmount = isNativeY ? amountY : amountX;
              totalLiquid = liquidityDistribution.reduce(function (prev, curr) {
                var currAmount = isNativeY ? curr.distributionY : curr.distributionX;
                return prev + currAmount;
              }, 0);
              if (totalLiquid) {
                amount = totalLiquid * totalAmount / MAX_BASIS_POINTS;
                associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
                transaction.add(SystemProgram.transfer({
                  fromPubkey: payer,
                  toPubkey: associatedUserVault,
                  lamports: amount
                }));
                transaction.add(createSyncNativeInstruction(associatedUserVault));
              }
            }
            _context8.n = 8;
            return getGasPrice(this.connection)["catch"](function () {
              return undefined;
            });
          case 8:
            unitSPrice = _context8.v;
            unitPrice = Math.max((_Number = Number(unitSPrice)) != null ? _Number : 0, UNIT_PRICE_DEFAULT * ((_this$bufferGas = this.bufferGas) != null ? _this$bufferGas : 1));
            hook = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("hook")), this.hooksConfig.toBuffer(), pair.toBuffer()], this.hooksProgram.programId)[0];
            position = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("position")), positionMint.toBuffer()], this.lbProgram.programId)[0];
            positionVault = getAssociatedTokenAddressSync(positionMint, payer, true, TOKEN_2022_PROGRAM_ID);
            _context8.n = 9;
            return this.lbProgram.methods.increasePosition(new BN(amountX), new BN(amountY), liquidityDistribution).accountsPartial({
              pair: pair,
              position: position,
              binArrayLower: binArrayLower,
              binArrayUpper: binArrayUpper,
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              positionTokenAccount: positionVault,
              tokenMintX: pairInfo.tokenMintX,
              tokenMintY: pairInfo.tokenMintY,
              tokenProgramX: tokenProgramX,
              tokenProgramY: tokenProgramY,
              positionTokenProgram: TOKEN_2022_PROGRAM_ID,
              hook: hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint: positionMint
            }).remainingAccounts([{
              pubkey: pair,
              isWritable: false,
              isSigner: false
            }, {
              pubkey: binArrayLower,
              isWritable: false,
              isSigner: false
            }, {
              pubkey: binArrayUpper,
              isWritable: false,
              isSigner: false
            }]).instruction();
          case 9:
            addLiquidityInstructions = _context8.v;
            transaction.add(ComputeBudgetProgram.setComputeUnitLimit({
              units: CCU_LIMIT
            }));
            transaction.add(ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: unitPrice
            }));
            transaction.add(addLiquidityInstructions);
          case 10:
            return _context8.a(2);
        }
      }, _callee8, this);
    }));
    function addLiquidityIntoPosition(_x8) {
      return _addLiquidityIntoPosition.apply(this, arguments);
    }
    return addLiquidityIntoPosition;
  }();
  _proto.removeMultipleLiquidity = /*#__PURE__*/function () {
    var _removeMultipleLiquidity = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(params) {
      var _Number2,
        _this$bufferGas2,
        _this = this;
      var maxPositionList, payer, type, pair, tokenMintX, tokenMintY, tokenProgramX, tokenProgramY, txCreateAccount, associatedPairVaultX, associatedPairVaultY, associatedUserVaultX, associatedUserVaultY, hook, associatedHookTokenY, infoHookTokenY, hookTokenYInstructions, unitSPrice, unitPrice, positionClosed, txs, txCloseAccount, isNativeY, associatedUserVault;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.n) {
          case 0:
            maxPositionList = params.maxPositionList, payer = params.payer, type = params.type, pair = params.pair, tokenMintX = params.tokenMintX, tokenMintY = params.tokenMintY;
            _context0.n = 1;
            return getProgram(tokenMintX, this.connection);
          case 1:
            tokenProgramX = _context0.v;
            _context0.n = 2;
            return getProgram(tokenMintY, this.connection);
          case 2:
            tokenProgramY = _context0.v;
            txCreateAccount = new Transaction();
            _context0.n = 3;
            return this.getPairVaultInfo({
              tokenAddress: tokenMintX,
              pair: pair,
              payer: payer,
              transaction: txCreateAccount
            });
          case 3:
            associatedPairVaultX = _context0.v;
            _context0.n = 4;
            return this.getPairVaultInfo({
              tokenAddress: tokenMintY,
              pair: pair,
              payer: payer,
              transaction: txCreateAccount
            });
          case 4:
            associatedPairVaultY = _context0.v;
            _context0.n = 5;
            return this.getUserVaultInfo({
              tokenAddress: tokenMintX,
              payer: payer,
              transaction: txCreateAccount
            });
          case 5:
            associatedUserVaultX = _context0.v;
            _context0.n = 6;
            return this.getUserVaultInfo({
              tokenAddress: tokenMintY,
              payer: payer,
              transaction: txCreateAccount
            });
          case 6:
            associatedUserVaultY = _context0.v;
            hook = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("hook")), this.hooksConfig.toBuffer(), pair.toBuffer()], this.hooksProgram.programId)[0];
            associatedHookTokenY = getAssociatedTokenAddressSync(tokenMintY, hook, true, tokenProgramY);
            _context0.n = 7;
            return this.connection.getAccountInfo(associatedHookTokenY);
          case 7:
            infoHookTokenY = _context0.v;
            if (!infoHookTokenY) {
              hookTokenYInstructions = createAssociatedTokenAccountInstruction(payer, associatedHookTokenY, hook, tokenMintY, tokenProgramY);
              txCreateAccount.add(hookTokenYInstructions);
            }
            _context0.n = 8;
            return getGasPrice(this.connection)["catch"](function () {
              return undefined;
            });
          case 8:
            unitSPrice = _context0.v;
            unitPrice = Math.max((_Number2 = Number(unitSPrice)) != null ? _Number2 : 0, UNIT_PRICE_DEFAULT * ((_this$bufferGas2 = this.bufferGas) != null ? _this$bufferGas2 : 1));
            positionClosed = [];
            _context0.n = 9;
            return Promise.all(maxPositionList.map(/*#__PURE__*/function () {
              var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(_ref) {
                var position, start, end, positionMint, binArrayIndex, _yield$_this$getBinAr, resultIndex, binArrayLower, binArrayUpper, tx, positionVault, reserveXY, hookBinArrayLower, hookBinArrayUpper, hookPosition, removedShares, availableShares, isClosePosition, instructions, _this$lbProgram$metho, _instructions, _t2, _t3;
                return _regenerator().w(function (_context9) {
                  while (1) switch (_context9.n) {
                    case 0:
                      position = _ref.position, start = _ref.start, end = _ref.end, positionMint = _ref.positionMint;
                      binArrayIndex = Math.floor(start / BIN_ARRAY_SIZE);
                      _context9.n = 1;
                      return _this.getBinArrayInfo({
                        binArrayIndex: binArrayIndex,
                        pair: pair,
                        payer: payer
                      });
                    case 1:
                      _yield$_this$getBinAr = _context9.v;
                      resultIndex = _yield$_this$getBinAr.resultIndex;
                      _context9.n = 2;
                      return _this.getBinArray({
                        binArrayIndex: resultIndex,
                        pair: pair,
                        payer: payer
                      });
                    case 2:
                      binArrayLower = _context9.v;
                      _context9.n = 3;
                      return _this.getBinArray({
                        binArrayIndex: resultIndex + 1,
                        pair: pair,
                        payer: payer
                      });
                    case 3:
                      binArrayUpper = _context9.v;
                      tx = new Transaction();
                      tx.add(ComputeBudgetProgram.setComputeUnitLimit({
                        units: CCU_LIMIT
                      }));
                      tx.add(ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: unitPrice
                      }));
                      positionVault = getAssociatedTokenAddressSync(new PublicKey(positionMint), payer, true, TOKEN_2022_PROGRAM_ID);
                      _t2 = cloneDeep;
                      _context9.n = 4;
                      return _this.getBinsReserveInformation({
                        position: new PublicKey(position),
                        pair: pair,
                        payer: payer
                      });
                    case 4:
                      _t3 = _context9.v;
                      reserveXY = _t2(_t3);
                      hookBinArrayLower = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), hook.toBuffer(), new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer$1, "le", 4)], _this.hooksProgram.programId)[0];
                      hookBinArrayUpper = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), hook.toBuffer(), new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer$1, "le", 4)], _this.hooksProgram.programId)[0];
                      hookPosition = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("position")), hook.toBuffer(), new PublicKey(position).toBuffer()], _this.hooksProgram.programId)[0];
                      removedShares = [];
                      if (type === "removeBoth") {
                        removedShares = reserveXY.map(function (reserve) {
                          var binId = reserve.binId;
                          if (binId >= Number(start) && binId <= Number(end)) {
                            return reserve.liquidityShare;
                          }
                          return new BN(0);
                        });
                      }
                      if (type === "removeBaseToken") {
                        removedShares = reserveXY.map(function (reserve) {
                          if (reserve.reserveX && reserve.reserveY === 0) {
                            return reserve.liquidityShare;
                          }
                          return new BN(0);
                        });
                      }
                      if (type === "removeQuoteToken") {
                        removedShares = reserveXY.map(function (reserve) {
                          if (reserve.reserveY && reserve.reserveX === 0) {
                            return reserve.liquidityShare;
                          }
                          return new BN(0);
                        });
                      }
                      availableShares = reserveXY.filter(function (item) {
                        return type === "removeBoth" ? !new BN(item.liquidityShare).eq(new BN(0)) : type === "removeQuoteToken" ? !item.reserveX : !item.reserveY;
                      });
                      isClosePosition = type === "removeBoth" && end - start + 1 >= availableShares.length || end - start + 1 === FIXED_LENGTH && availableShares.length === FIXED_LENGTH;
                      if (!isClosePosition) {
                        _context9.n = 6;
                        break;
                      }
                      _context9.n = 5;
                      return _this.lbProgram.methods.closePosition().accountsPartial({
                        pair: pair,
                        position: position,
                        binArrayLower: binArrayLower,
                        binArrayUpper: binArrayUpper,
                        tokenVaultX: associatedPairVaultX,
                        tokenVaultY: associatedPairVaultY,
                        userVaultX: associatedUserVaultX,
                        userVaultY: associatedUserVaultY,
                        positionTokenAccount: positionVault,
                        tokenMintX: tokenMintX,
                        tokenMintY: tokenMintY,
                        tokenProgramX: tokenProgramX,
                        tokenProgramY: tokenProgramY,
                        positionTokenProgram: TOKEN_2022_PROGRAM_ID,
                        hook: hook,
                        hooksProgram: _this.hooksProgram.programId,
                        user: payer,
                        positionMint: positionMint
                      }).instruction();
                    case 5:
                      instructions = _context9.v;
                      positionClosed.push({
                        position: position
                      });
                      tx.add(instructions);
                      _context9.n = 8;
                      break;
                    case 6:
                      _context9.n = 7;
                      return (_this$lbProgram$metho = _this.lbProgram.methods.decreasePosition(removedShares).accountsPartial({
                        pair: pair,
                        position: position,
                        binArrayLower: binArrayLower,
                        binArrayUpper: binArrayUpper,
                        tokenVaultX: associatedPairVaultX,
                        tokenVaultY: associatedPairVaultY,
                        userVaultX: associatedUserVaultX,
                        userVaultY: associatedUserVaultY,
                        positionTokenAccount: positionVault,
                        tokenMintX: tokenMintX,
                        tokenMintY: tokenMintY,
                        tokenProgramX: tokenProgramX,
                        tokenProgramY: tokenProgramY,
                        positionTokenProgram: TOKEN_2022_PROGRAM_ID,
                        hook: hook,
                        hooksProgram: _this.hooksProgram.programId,
                        user: payer,
                        positionMint: positionMint
                      })) == null ? void 0 : _this$lbProgram$metho.remainingAccounts([{
                        pubkey: pair,
                        isWritable: false,
                        isSigner: false
                      }, {
                        pubkey: binArrayLower,
                        isWritable: false,
                        isSigner: false
                      }, {
                        pubkey: binArrayUpper,
                        isWritable: false,
                        isSigner: false
                      }, {
                        pubkey: hookBinArrayLower,
                        isWritable: true,
                        isSigner: false
                      }, {
                        pubkey: hookBinArrayUpper,
                        isWritable: true,
                        isSigner: false
                      }, {
                        pubkey: hookPosition,
                        isWritable: true,
                        isSigner: false
                      }]).instruction();
                    case 7:
                      _instructions = _context9.v;
                      tx.add(_instructions);
                    case 8:
                      return _context9.a(2, tx);
                  }
                }, _callee9);
              }));
              return function (_x0) {
                return _ref2.apply(this, arguments);
              };
            }()));
          case 9:
            txs = _context0.v;
            txCloseAccount = new Transaction();
            if (tokenMintY.toString() === WRAP_SOL_ADDRESS || tokenMintX.toString() === WRAP_SOL_ADDRESS) {
              isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;
              associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
              txCloseAccount.add(createCloseAccountInstruction(associatedUserVault, payer, payer));
            }
            return _context0.a(2, {
              txs: txs,
              txCreateAccount: txCreateAccount.instructions.length ? txCreateAccount : undefined,
              txCloseAccount: txCloseAccount.instructions.length ? txCloseAccount : undefined,
              positionClosed: positionClosed
            });
        }
      }, _callee0, this);
    }));
    function removeMultipleLiquidity(_x9) {
      return _removeMultipleLiquidity.apply(this, arguments);
    }
    return removeMultipleLiquidity;
  }();
  _proto.swap = /*#__PURE__*/function () {
    var _swap = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1(params) {
      var tokenMintX, tokenMintY, amount, otherAmountOffset, swapForY, isExactInput, pair, hook, payer, pairInfo, binArrayIndex, binArrayLower, binArrayUpper, _yield$Promise$all, tokenProgramX, tokenProgramY, latestBlockHash, tx, associatedPairVaultX, associatedPairVaultY, associatedUserVaultX, associatedUserVaultY, infoUserVaultX, userVaultXInstructions, infoUserVaultY, userVaultYInstructions, hookBinArrayLower, hookBinArrayUpper, isNativeY, associatedUserVault, swapInstructions, _isNativeY, _associatedUserVault;
      return _regenerator().w(function (_context1) {
        while (1) switch (_context1.n) {
          case 0:
            tokenMintX = params.tokenMintX, tokenMintY = params.tokenMintY, amount = params.amount, otherAmountOffset = params.otherAmountOffset, swapForY = params.swapForY, isExactInput = params.isExactInput, pair = params.pair, hook = params.hook, payer = params.payer;
            _context1.n = 1;
            return this.getPairAccount(pair);
          case 1:
            pairInfo = _context1.v;
            if (pairInfo) {
              _context1.n = 2;
              break;
            }
            throw new Error("Pair not found");
          case 2:
            binArrayIndex = pairInfo.activeId / BIN_ARRAY_SIZE;
            if (pairInfo.activeId % BIN_ARRAY_SIZE < BIN_ARRAY_SIZE / 2) {
              binArrayIndex -= 1;
            }
            _context1.n = 3;
            return this.getBinArray({
              binArrayIndex: binArrayIndex,
              pair: pair,
              payer: payer
            });
          case 3:
            binArrayLower = _context1.v;
            _context1.n = 4;
            return this.getBinArray({
              binArrayIndex: binArrayIndex + 1,
              pair: pair,
              payer: payer
            });
          case 4:
            binArrayUpper = _context1.v;
            _context1.n = 5;
            return Promise.all([getProgram(tokenMintX, this.connection), getProgram(tokenMintY, this.connection)]);
          case 5:
            _yield$Promise$all = _context1.v;
            tokenProgramX = _yield$Promise$all[0];
            tokenProgramY = _yield$Promise$all[1];
            _context1.n = 6;
            return this.connection.getLatestBlockhash();
          case 6:
            latestBlockHash = _context1.v;
            tx = new Transaction({
              feePayer: payer,
              blockhash: latestBlockHash.blockhash,
              lastValidBlockHeight: latestBlockHash.lastValidBlockHeight
            });
            associatedPairVaultX = getAssociatedTokenAddressSync(tokenMintX, pair, true, tokenProgramX);
            associatedPairVaultY = getAssociatedTokenAddressSync(tokenMintY, pair, true, tokenProgramY);
            associatedUserVaultX = getAssociatedTokenAddressSync(tokenMintX, payer, true, tokenProgramX);
            associatedUserVaultY = getAssociatedTokenAddressSync(tokenMintY, payer, true, tokenProgramY);
            _context1.n = 7;
            return this.connection.getAccountInfo(associatedUserVaultX);
          case 7:
            infoUserVaultX = _context1.v;
            if (!infoUserVaultX) {
              userVaultXInstructions = createAssociatedTokenAccountInstruction(payer, associatedUserVaultX, payer, tokenMintX, tokenProgramX);
              tx.add(userVaultXInstructions);
            }
            _context1.n = 8;
            return this.connection.getAccountInfo(associatedUserVaultY);
          case 8:
            infoUserVaultY = _context1.v;
            if (!infoUserVaultY) {
              userVaultYInstructions = createAssociatedTokenAccountInstruction(payer, associatedUserVaultY, payer, tokenMintY, tokenProgramY);
              tx.add(userVaultYInstructions);
            }
            hookBinArrayLower = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), hook.toBuffer(), new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer$1, "le", 4)], this.hooksProgram.programId)[0];
            hookBinArrayUpper = PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("bin_array")), hook.toBuffer(), new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer$1, "le", 4)], this.hooksProgram.programId)[0];
            if (tokenMintY.toString() === WRAP_SOL_ADDRESS || tokenMintX.toString() === WRAP_SOL_ADDRESS) {
              isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;
              associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
              if (isNativeY && !swapForY) {
                tx.add(SystemProgram.transfer({
                  fromPubkey: payer,
                  toPubkey: associatedUserVault,
                  lamports: amount
                }));
                tx.add(createSyncNativeInstruction(associatedUserVault));
              }
              if (!isNativeY && swapForY) {
                tx.add(SystemProgram.transfer({
                  fromPubkey: payer,
                  toPubkey: associatedUserVault,
                  lamports: amount
                }));
                tx.add(createSyncNativeInstruction(associatedUserVault));
              }
            }
            _context1.n = 9;
            return this.lbProgram.methods.swap(new BN(amount.toString()), new BN(otherAmountOffset.toString()), swapForY, isExactInput ? {
              exactInput: {}
            } : {
              exactOutput: {}
            }).accountsPartial({
              pair: pair,
              binArrayLower: binArrayLower,
              binArrayUpper: binArrayUpper,
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              tokenMintX: tokenMintX,
              tokenMintY: tokenMintY,
              tokenProgramX: tokenProgramX,
              tokenProgramY: tokenProgramY,
              user: payer
            }).remainingAccounts([{
              pubkey: pair,
              isWritable: false,
              isSigner: false
            }, {
              pubkey: binArrayLower,
              isWritable: false,
              isSigner: false
            }, {
              pubkey: binArrayUpper,
              isWritable: false,
              isSigner: false
            }, {
              pubkey: hookBinArrayLower,
              isWritable: true,
              isSigner: false
            }, {
              pubkey: hookBinArrayUpper,
              isWritable: true,
              isSigner: false
            }]).instruction();
          case 9:
            swapInstructions = _context1.v;
            tx.add(swapInstructions);
            if (tokenMintY.toString() === WRAP_SOL_ADDRESS || tokenMintX.toString() === WRAP_SOL_ADDRESS) {
              _isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;
              _associatedUserVault = _isNativeY ? associatedUserVaultY : associatedUserVaultX;
              if (_isNativeY && swapForY || !_isNativeY && !swapForY) {
                tx.add(createCloseAccountInstruction(_associatedUserVault, payer, payer));
              }
            }
            return _context1.a(2, tx);
        }
      }, _callee1, this);
    }));
    function swap(_x1) {
      return _swap.apply(this, arguments);
    }
    return swap;
  }();
  _proto.getQuote = /*#__PURE__*/function () {
    var _getQuote = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10(params) {
      var data, amountIn, amountOut, slippageFraction, slippageScaled, maxAmountIn, minAmountOut, _yield$this$getMaxAmo, maxAmountOut, priceImpact, _t4;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.n) {
          case 0:
            _context10.p = 0;
            _context10.n = 1;
            return LBSwapService.fromLbConfig(this.lbProgram, this.connection).calculateInOutAmount(params);
          case 1:
            data = _context10.v;
            amountIn = data.amountIn, amountOut = data.amountOut;
            slippageFraction = params.slippage / 100;
            slippageScaled = Math.round(slippageFraction * PRECISION);
            maxAmountIn = amountIn;
            minAmountOut = amountOut;
            if (params.isExactInput) {
              minAmountOut = amountOut * BigInt(PRECISION - slippageScaled) / BigInt(PRECISION);
            } else {
              // max mount in should div for slippage
              maxAmountIn = amountIn * BigInt(PRECISION) / BigInt(PRECISION - slippageScaled);
            }
            _context10.n = 2;
            return this.getMaxAmountOutWithFee(params.pair, Number(amountIn.toString()), params.swapForY, params.tokenBaseDecimal, params.tokenQuoteDecimal);
          case 2:
            _yield$this$getMaxAmo = _context10.v;
            maxAmountOut = _yield$this$getMaxAmo.maxAmountOut;
            priceImpact = new bigDecimal(amountOut).subtract(new bigDecimal(maxAmountOut)).divide(new bigDecimal(maxAmountOut)).multiply(new bigDecimal(100)).getValue();
            return _context10.a(2, {
              amountIn: amountIn,
              amountOut: amountOut,
              amount: params.isExactInput ? maxAmountIn : minAmountOut,
              otherAmountOffset: params.isExactInput ? minAmountOut : maxAmountIn,
              priceImpact: Number(priceImpact)
            });
          case 3:
            _context10.p = 3;
            _t4 = _context10.v;
            throw _t4;
          case 4:
            return _context10.a(2);
        }
      }, _callee10, this, [[0, 3]]);
    }));
    function getQuote(_x10) {
      return _getQuote.apply(this, arguments);
    }
    return getQuote;
  }();
  _proto.getMaxAmountOutWithFee = /*#__PURE__*/function () {
    var _getMaxAmountOutWithFee = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11(pairAddress, amount, swapForY, decimalBase, decimalQuote) {
      var amountIn, pair, activeId, binStep, swapService, feePrice, activePrice, price, feeAmount, maxAmountOut;
      return _regenerator().w(function (_context11) {
        while (1) switch (_context11.n) {
          case 0:
            if (swapForY === void 0) {
              swapForY = false;
            }
            if (decimalBase === void 0) {
              decimalBase = 9;
            }
            if (decimalQuote === void 0) {
              decimalQuote = 9;
            }
            _context11.p = 1;
            amountIn = BigInt(amount);
            _context11.n = 2;
            return this.getPairAccount(pairAddress);
          case 2:
            pair = _context11.v;
            activeId = pair == null ? void 0 : pair.activeId;
            binStep = pair == null ? void 0 : pair.binStep;
            swapService = LBSwapService.fromLbConfig(this.lbProgram, this.connection);
            feePrice = swapService.getTotalFee(pair);
            activePrice = getPriceFromId(binStep, activeId, 9, 9);
            price = getPriceFromId(binStep, activeId, decimalBase, decimalQuote);
            feeAmount = swapService.getFeeAmount(amountIn, feePrice);
            amountIn = BigInt(amountIn) - BigInt(feeAmount); // new BN(amountIn).subtract(new BN(feeAmount));
            maxAmountOut = swapForY ? mulShr(Number(amountIn.toString()), activePrice, SCALE_OFFSET, "down") : shlDiv(Number(amountIn.toString()), activePrice, SCALE_OFFSET, "down");
            return _context11.a(2, {
              maxAmountOut: maxAmountOut,
              price: price
            });
          case 3:
            _context11.p = 3;
            return _context11.a(2, {
              maxAmountOut: 0,
              price: 0
            });
        }
      }, _callee11, this, [[1, 3]]);
    }));
    function getMaxAmountOutWithFee(_x11, _x12, _x13, _x14, _x15) {
      return _getMaxAmountOutWithFee.apply(this, arguments);
    }
    return getMaxAmountOutWithFee;
  }();
  _proto.getDexName = function getDexName() {
    return "Saros DLMM";
  };
  _proto.getDexProgramId = function getDexProgramId() {
    return this.lbProgram.programId;
  };
  _proto.fetchPoolAddresses = /*#__PURE__*/function () {
    var _fetchPoolAddresses = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
      var programId, connection, pairAccount, pairAccountDiscriminator, accounts, poolAdresses;
      return _regenerator().w(function (_context12) {
        while (1) switch (_context12.n) {
          case 0:
            programId = this.getDexProgramId();
            connection = this.connection;
            pairAccount = LiquidityBookIDL.accounts.find(function (acc) {
              return acc.name === "Pair";
            });
            pairAccountDiscriminator = pairAccount ? pairAccount.discriminator : undefined;
            if (pairAccountDiscriminator) {
              _context12.n = 1;
              break;
            }
            throw new Error("Pair account not found");
          case 1:
            _context12.n = 2;
            return connection.getProgramAccounts(new PublicKey(programId), {
              filters: [{
                memcmp: {
                  offset: 0,
                  bytes: bs58.encode(pairAccountDiscriminator)
                }
              }]
            });
          case 2:
            accounts = _context12.v;
            if (!(accounts.length === 0)) {
              _context12.n = 3;
              break;
            }
            throw new Error("Pair not found");
          case 3:
            poolAdresses = accounts.reduce(function (addresses, account) {
              if (account.account.owner.toString() !== programId.toString()) {
                return addresses;
              }
              if (account.account.data.length < 8) {
                return addresses;
              }
              addresses.push(account.pubkey.toString());
              return addresses;
            }, []);
            return _context12.a(2, poolAdresses);
        }
      }, _callee12, this);
    }));
    function fetchPoolAddresses() {
      return _fetchPoolAddresses.apply(this, arguments);
    }
    return fetchPoolAddresses;
  }();
  _proto.getUserPositions = /*#__PURE__*/function () {
    var _getUserPositions = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14(_ref3) {
      var _this2 = this;
      var payer, pair, connection, tokenAccounts, positionMints, positions;
      return _regenerator().w(function (_context14) {
        while (1) switch (_context14.n) {
          case 0:
            payer = _ref3.payer, pair = _ref3.pair;
            connection = this.connection;
            _context14.n = 1;
            return connection.getParsedTokenAccountsByOwner(payer, {
              programId: TOKEN_2022_PROGRAM_ID
            });
          case 1:
            tokenAccounts = _context14.v;
            positionMints = tokenAccounts.value.filter(function (acc) {
              var amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
              // Only interested in NFTs or position tokens with amount > 0
              return amount && amount > 0;
            }).map(function (acc) {
              return new PublicKey(acc.account.data.parsed.info.mint);
            });
            _context14.n = 2;
            return Promise.all(positionMints.map(/*#__PURE__*/function () {
              var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13(mint) {
                var _yield$PublicKey$find, positionPda, accountInfo, position;
                return _regenerator().w(function (_context13) {
                  while (1) switch (_context13.n) {
                    case 0:
                      _context13.n = 1;
                      return PublicKey.findProgramAddressSync([Buffer$1.from(utils.bytes.utf8.encode("position")), mint.toBuffer()], _this2.lbProgram.programId);
                    case 1:
                      _yield$PublicKey$find = _context13.v;
                      positionPda = _yield$PublicKey$find[0];
                      _context13.p = 2;
                      _context13.n = 3;
                      return connection.getAccountInfo(positionPda);
                    case 3:
                      accountInfo = _context13.v;
                      if (accountInfo) {
                        _context13.n = 4;
                        break;
                      }
                      return _context13.a(2, null);
                    case 4:
                      _context13.n = 5;
                      return _this2.lbProgram.account.position.fetch(positionPda);
                    case 5:
                      position = _context13.v;
                      if (!(position.pair.toString() !== pair.toString())) {
                        _context13.n = 6;
                        break;
                      }
                      return _context13.a(2, null);
                    case 6:
                      return _context13.a(2, _extends({}, position, {
                        position: positionPda.toString()
                      }));
                    case 7:
                      _context13.p = 7;
                      return _context13.a(2, null);
                  }
                }, _callee13, null, [[2, 7]]);
              }));
              return function (_x17) {
                return _ref4.apply(this, arguments);
              };
            }()));
          case 2:
            positions = _context14.v;
            return _context14.a(2, positions.filter(Boolean));
        }
      }, _callee14, this);
    }));
    function getUserPositions(_x16) {
      return _getUserPositions.apply(this, arguments);
    }
    return getUserPositions;
  }();
  _proto.quote = /*#__PURE__*/function () {
    var _quote = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15(params) {
      var amount, metadata, optional;
      return _regenerator().w(function (_context15) {
        while (1) switch (_context15.n) {
          case 0:
            amount = params.amount, metadata = params.metadata, optional = params.optional;
            _context15.n = 1;
            return this.getQuote({
              amount: BigInt(amount),
              isExactInput: optional.isExactInput,
              pair: new PublicKey(metadata.poolAddress),
              slippage: optional.slippage,
              swapForY: optional.swapForY,
              tokenBase: new PublicKey(metadata.baseMint),
              tokenBaseDecimal: metadata.extra.tokenBaseDecimal,
              tokenQuote: new PublicKey(metadata.quoteMint),
              tokenQuoteDecimal: metadata.extra.tokenQuoteDecimal
            });
          case 1:
            return _context15.a(2, _context15.v);
        }
      }, _callee15, this);
    }));
    function quote(_x18) {
      return _quote.apply(this, arguments);
    }
    return quote;
  }();
  _proto.fetchPoolMetadata = /*#__PURE__*/function () {
    var _fetchPoolMetadata = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee16(pair) {
      var _pairInfo$hook;
      var connection, pairInfo, basePairVault, quotePairVault, _yield$Promise$all2, baseReserve, quoteReserve;
      return _regenerator().w(function (_context16) {
        while (1) switch (_context16.n) {
          case 0:
            connection = this.connection; //@ts-ignore
            _context16.n = 1;
            return this.lbProgram.account.pair.fetch(new PublicKey(pair));
          case 1:
            pairInfo = _context16.v;
            if (pairInfo) {
              _context16.n = 2;
              break;
            }
            throw new Error("Pair not found");
          case 2:
            _context16.n = 3;
            return this.getPairVaultInfo({
              tokenAddress: new PublicKey(pairInfo.tokenMintX),
              pair: new PublicKey(pair)
            });
          case 3:
            basePairVault = _context16.v;
            _context16.n = 4;
            return this.getPairVaultInfo({
              tokenAddress: new PublicKey(pairInfo.tokenMintY),
              pair: new PublicKey(pair)
            });
          case 4:
            quotePairVault = _context16.v;
            _context16.n = 5;
            return Promise.all([connection.getTokenAccountBalance(basePairVault)["catch"](function () {
              return {
                value: {
                  uiAmount: 0,
                  amount: "0",
                  decimals: 0,
                  uiAmountString: "0"
                }
              };
            }), connection.getTokenAccountBalance(quotePairVault)["catch"](function () {
              return {
                value: {
                  uiAmount: 0,
                  amount: "0",
                  decimals: 0,
                  uiAmountString: "0"
                }
              };
            })]);
          case 5:
            _yield$Promise$all2 = _context16.v;
            baseReserve = _yield$Promise$all2[0];
            quoteReserve = _yield$Promise$all2[1];
            return _context16.a(2, {
              poolAddress: pair,
              baseMint: pairInfo.tokenMintX.toString(),
              baseReserve: baseReserve.value.amount,
              quoteMint: pairInfo.tokenMintY.toString(),
              quoteReserve: quoteReserve.value.amount,
              tradeFee: pairInfo.staticFeeParameters.baseFactor * pairInfo.binStep / 1e6,
              extra: {
                hook: (_pairInfo$hook = pairInfo.hook) == null ? void 0 : _pairInfo$hook.toString(),
                tokenQuoteDecimal: baseReserve.value.decimals,
                tokenBaseDecimal: quoteReserve.value.decimals
              }
            });
        }
      }, _callee16, this);
    }));
    function fetchPoolMetadata(_x19) {
      return _fetchPoolMetadata.apply(this, arguments);
    }
    return fetchPoolMetadata;
  }();
  _proto.getPairVaultInfo = /*#__PURE__*/function () {
    var _getPairVaultInfo = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee17(params) {
      var tokenAddress, pair, payer, transaction, tokenMint, tokenProgram, associatedPairVault, infoPairVault, pairVaultYInstructions;
      return _regenerator().w(function (_context17) {
        while (1) switch (_context17.n) {
          case 0:
            tokenAddress = params.tokenAddress, pair = params.pair, payer = params.payer, transaction = params.transaction;
            tokenMint = new PublicKey(tokenAddress);
            _context17.n = 1;
            return getProgram(tokenMint, this.connection);
          case 1:
            tokenProgram = _context17.v;
            associatedPairVault = getAssociatedTokenAddressSync(tokenMint, pair, true, tokenProgram);
            if (!(transaction && payer)) {
              _context17.n = 3;
              break;
            }
            _context17.n = 2;
            return this.connection.getAccountInfo(associatedPairVault);
          case 2:
            infoPairVault = _context17.v;
            if (!infoPairVault) {
              pairVaultYInstructions = createAssociatedTokenAccountInstruction(payer, associatedPairVault, pair, tokenMint, tokenProgram);
              transaction.add(pairVaultYInstructions);
            }
          case 3:
            return _context17.a(2, associatedPairVault);
        }
      }, _callee17, this);
    }));
    function getPairVaultInfo(_x20) {
      return _getPairVaultInfo.apply(this, arguments);
    }
    return getPairVaultInfo;
  }();
  _proto.getUserVaultInfo = /*#__PURE__*/function () {
    var _getUserVaultInfo = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee18(params) {
      var tokenAddress, payer, transaction, tokenProgram, associatedUserVault, infoUserVault, userVaultYInstructions;
      return _regenerator().w(function (_context18) {
        while (1) switch (_context18.n) {
          case 0:
            tokenAddress = params.tokenAddress, payer = params.payer, transaction = params.transaction;
            _context18.n = 1;
            return getProgram(tokenAddress, this.connection);
          case 1:
            tokenProgram = _context18.v;
            associatedUserVault = getAssociatedTokenAddressSync(tokenAddress, payer, true, tokenProgram);
            if (!transaction) {
              _context18.n = 3;
              break;
            }
            _context18.n = 2;
            return this.connection.getAccountInfo(associatedUserVault);
          case 2:
            infoUserVault = _context18.v;
            if (!infoUserVault) {
              userVaultYInstructions = createAssociatedTokenAccountInstruction(payer, associatedUserVault, payer, tokenAddress, tokenProgram);
              transaction.add(userVaultYInstructions);
            }
          case 3:
            return _context18.a(2, associatedUserVault);
        }
      }, _callee18, this);
    }));
    function getUserVaultInfo(_x21) {
      return _getUserVaultInfo.apply(this, arguments);
    }
    return getUserVaultInfo;
  }();
  _proto.listenNewPoolAddress = /*#__PURE__*/function () {
    var _listenNewPoolAddress = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee19(postTxFunction) {
      var _this3 = this;
      var LB_PROGRAM_ID;
      return _regenerator().w(function (_context19) {
        while (1) switch (_context19.n) {
          case 0:
            LB_PROGRAM_ID = this.getDexProgramId();
            this.connection.onLogs(LB_PROGRAM_ID, function (logInfo) {
              if (!logInfo.err) {
                var logs = logInfo.logs || [];
                for (var _iterator = _createForOfIteratorHelperLoose(logs), _step; !(_step = _iterator()).done;) {
                  var log = _step.value;
                  if (log.includes("Instruction: InitializePair")) {
                    var signature = logInfo.signature;
                    _this3.getPairAddressFromLogs(signature).then(function (address) {
                      postTxFunction(address);
                    });
                  }
                }
              }
            }, "finalized");
          case 1:
            return _context19.a(2);
        }
      }, _callee19, this);
    }));
    function listenNewPoolAddress(_x22) {
      return _listenNewPoolAddress.apply(this, arguments);
    }
    return listenNewPoolAddress;
  }();
  _proto.getPairAddressFromLogs = /*#__PURE__*/function () {
    var _getPairAddressFromLogs = /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee20(signature) {
      var parsedTransaction, compiledMessage, message, instructions, initializePairStruct, initializePairDescrimator, pairAddress, _loop, _iterator2, _step2;
      return _regenerator().w(function (_context21) {
        while (1) switch (_context21.n) {
          case 0:
            _context21.n = 1;
            return this.connection.getTransaction(signature, {
              maxSupportedTransactionVersion: 0
            });
          case 1:
            parsedTransaction = _context21.v;
            if (parsedTransaction) {
              _context21.n = 2;
              break;
            }
            throw new Error("Transaction not found");
          case 2:
            compiledMessage = parsedTransaction.transaction.message;
            message = TransactionMessage.decompile(compiledMessage);
            instructions = message.instructions;
            initializePairStruct = LiquidityBookIDL.instructions.find(function (item) {
              return item.name === "initialize_pair";
            });
            initializePairDescrimator = Buffer$1.from(initializePairStruct.discriminator);
            pairAddress = "";
            _loop = /*#__PURE__*/_regenerator().m(function _loop() {
              var _accounts$find;
              var instruction, descimatorInstruction, accounts;
              return _regenerator().w(function (_context20) {
                while (1) switch (_context20.n) {
                  case 0:
                    instruction = _step2.value;
                    descimatorInstruction = instruction.data.subarray(0, 8);
                    if (descimatorInstruction.equals(initializePairDescrimator)) {
                      _context20.n = 1;
                      break;
                    }
                    return _context20.a(2, 1);
                  case 1:
                    //@ts-ignore
                    accounts = initializePairStruct.accounts.map(function (item, index) {
                      return {
                        name: item.name,
                        address: instruction.keys[index].pubkey.toString()
                      };
                    });
                    pairAddress = ((_accounts$find = accounts.find(function (item) {
                      return item.name === "pair";
                    })) == null ? void 0 : _accounts$find.address) || "";
                  case 2:
                    return _context20.a(2);
                }
              }, _loop);
            });
            _iterator2 = _createForOfIteratorHelperLoose(instructions);
          case 3:
            if ((_step2 = _iterator2()).done) {
              _context21.n = 6;
              break;
            }
            return _context21.d(_regeneratorValues(_loop()), 4);
          case 4:
            if (!_context21.v) {
              _context21.n = 5;
              break;
            }
            return _context21.a(3, 5);
          case 5:
            _context21.n = 3;
            break;
          case 6:
            return _context21.a(2, pairAddress);
        }
      }, _callee20, this);
    }));
    function getPairAddressFromLogs(_x23) {
      return _getPairAddressFromLogs.apply(this, arguments);
    }
    return getPairAddressFromLogs;
  }();
  return _createClass(LiquidityBookServices, [{
    key: "lbConfig",
    get: function get() {
      return new PublicKey("BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8");
    }
  }, {
    key: "hooksConfig",
    get: function get() {
      return new PublicKey("DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF");
    }
  }]);
}(LiquidityBookAbstract);

export { ACTIVE_ID, BASE_FACTOR, BASIS_POINT_MAX, BIN_ARRAY_INDEX, BIN_ARRAY_SIZE, BIN_STEP, BIN_STEP_CONFIGS, CCU_LIMIT, CONFIG, DECAY_PERIOD, FILTER_PERIOD, FIXED_LENGTH, LiquidityBookServices, MAX_BASIS_POINTS, MAX_VOLATILITY_ACCUMULATOR, MODE, ONE, PRECISION, PROTOCOL_SHARE, REDUCTION_FACTOR, REWARDS_DURATION, REWARDS_PER_SECOND, SCALE_OFFSET, START_TIME, UNIT_PRICE_DEFAULT, VARIABLE_FEE_CONTROL, VARIABLE_FEE_PRECISION, WRAP_SOL_ADDRESS };
//# sourceMappingURL=dlmm-sdk.esm.js.map
