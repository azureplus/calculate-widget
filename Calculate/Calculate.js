if (typeof Calculate === "undefined" || !Calculate) {
    var Calculate = {};
}

org.antlr.runtime.BaseRecognizer.prototype.emitErrorMessage = function(message) {
    Calculate.log(message)
}

// For ECMAScript3ExtParser
String.prototype.matches = function(regex) {
    return this.match(regex) != null
}

function __typeof__(v) {
    // This works for unknown variables
    //   typeof unknown == "undefined"
    // However, it should throw a ReferenceError for expressions, but instead returns "undefined"
    //   typeof (unknown + 1) // should throw ReferenceError
    with (Calculate.sandbox) {
        try {
            return typeof eval(v);
        } catch (err) {
            if (err instanceof ReferenceError) {
                return "undefined";
            } else {
                throw err;
            }
        }
    }
};

Calculate.isNativeFunction = function(value) {
    // From https://stackoverflow.com/a/6599105
    return typeof value === "function" && /\{\s+\[native code\]/.test(Function.prototype.toString.call(value))
};

Calculate.valueToString = function(value) {
    if (value === undefined) {
        return "undefined";
    } else if (value === null) {
        return "null";
    } else if (value === globalThis) {
        return "this";
    } else if (typeof value === "boolean") {
        return value.toString();
    } else if (typeof value === "number") {
        return Calculate.fixPrecision(value).toString();
    } else if (value instanceof Array) {
        return Calculate.arrayToString(value);
    } else if (typeof value === "string") {
        return '"' + value + '"';
    } else if (typeof value === "function") {
        return value.toString();
    } else if (typeof value === "object" && value.toString() == "[object Object]") {
        return Calculate.objectToString(value);
    } else {
        return '"' + value.toString() + '"';
    }
};

Calculate.arrayToString = function(a) {
    let s = "";
    for (let i = 0; i < a.length; i++) {
        s += Calculate.valueToString(a[i]);
        if (i < a.length - 1) {
            s += ", ";
        }
    }
    return "[" + s + "]";
};

Calculate.objectToString = function(obj) {
    let s = "";
    for (const i in obj) {
        if (obj.hasOwnProperty(i)) {
            const value = Calculate.valueToString(obj[i]);
            s += '"' + i + '": ' + value + ", ";
        }
    }
    // Remove trailing comma
    if (s.charAt(s.length - 2) === ",") {
        s = s.substring(0, s.length - 2);
    }
    return "{" + s + "}";
};

Calculate.fixPrecision = function(n) {
    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function getSignificantDigits(n) {
        const s = Math.abs(n).toString().split("e")[0].split(".");

        // String before decimal. Remove leading zeroes
        const a = s[0].replace(/^0+/, "");
        // String after decimal. Remove trailing zeroes
        const b = s.length === 1 ? "" : s[1].replace(/0*$/, "");

        if (b.length === 0) {
            // Remove trailing zeroes
            return a.replace(/0*$/, "").length;
        } else if (a.length === 0) {
            // Remove leading zeroes
            return b.replace(/^0+/, "").length;
        } else {
            return a.length + b.length;
        }
    }

    if (isNumber(n)) {
        const p = getSignificantDigits(n);
        // If the number has at least 13 significant digits, reduce to 9 significant digits.
        // If the resulting number has much less precision, then use it instead of the original number.
        if (p >= 13) {
            const n2 = parseFloat(n.toPrecision(9));
            if (getSignificantDigits(n2) < 9) {
                n = n2;
            }
        }
    }
    return n;
};

Calculate.knownMembers = (function() {
    // List of known properties at startup (like Calculate, org.antlr.*)
    var knownMembers = [];
    for (const i in globalThis) {
        if (globalThis.hasOwnProperty(i)) {
            knownMembers.push(i);
        }
    }
    return knownMembers;
})();

Calculate.sandbox = { "ans": 0 };

/* Use a proxy prevents access to:
 - Globals (Calculate, org.antlr.*, etc)
*/
Calculate.sandboxProxy = new Proxy(Calculate.sandbox, {
    has: function(target, key) {
        return key !== "__input__" && key != "__typeof__";
    },

    get: function(target, key) {
        if (typeof key !== "string") {
            return undefined;
        } else if (key === "globalThis") {
            return globalThis;
        } else if (Calculate.Math.hasOwnProperty(key)) {
            return Calculate.Math[key];
        } else if (globalThis.hasOwnProperty(key) && !Calculate.knownMembers.includes(key)) {
            return globalThis[key];
        } else if (target.hasOwnProperty(key)) {
            return Reflect.get(...arguments);
        } else {
            throw new ReferenceError("Can't find variable: " + key);
        }
    },
                                   
   set: function(target, key, value) {
       if (Calculate.Math.hasOwnProperty(key)) {
           throw new TypeError("\"" + key + "\" is a constant");
       }
       const isGlobalConst = key === "globalThis" || (globalThis.hasOwnProperty(key) && !Calculate.knownMembers.includes(key));
       if (!isGlobalConst) {
           return Reflect.set(...arguments);
       }
   },

   deleteProperty: function(target, key) {
       if (target.hasOwnProperty(key) && key !== "globalThis") {
           return delete target[key];
       } else {
           return false;
       }
   }
});

Calculate.evaluate = function(__input__) {
    // Wrap in anonymous function so "this" is the global object, not Calculate
    // Use "eval" instead of "Function" to get the last statement on the line ("5;6;")
    return (function() {
        with (Calculate.sandboxProxy) {
            return eval(__input__);
        }
    })();
};

Calculate.log = function(message) {
    // Overwritten by native code
};

Calculate.getUserVars = function() {
    var userVars = [];
    
    for (const i in Calculate.sandbox) {
        if (Calculate.sandbox.hasOwnProperty(i)) {
            userVars.push(i);
        }
    }
    
    return userVars;
};

Calculate.getUserVar = function(name) {
    return Calculate.sandbox[name] 
}

// Returns an array of tuples, like: [[name, value], [name, value]]
Calculate.getMemoryVars = function() {
    const userVars = Calculate.getUserVars();
    let memory = [];
    for (const i in userVars) {
        if (userVars.hasOwnProperty(i)) {
            const name = userVars[i];
            const value = Calculate.sandbox[name];
            if (!Calculate.isNativeFunction(value)) {
                memory.push([name, Calculate.valueToString(value)])
            }
        }
    }
    return memory;
};

Calculate.getConstants = function() {
    let constants = []
    constants.push(["pi", Calculate.valueToString(Calculate.Math.pi)])
    constants.push(["e", Calculate.valueToString(Calculate.Math.e)])
    return constants;
}

Calculate.clearUserVars = function() {
    Calculate.sandbox["ans"] = 0;
    
    const userVars = Calculate.getUserVars();
    for (const i in userVars) {
        if (userVars.hasOwnProperty(i)) {
            const name = userVars[i];
            try {
                delete name;
            } catch (ex) {
                // Ignore
            }
        }
    }
};

Calculate.getPossibleCompletions = function() {
    const possibleCompletions = Calculate.getUserVars();
    for (const i in Calculate.Math) {
        if (Calculate.Math.hasOwnProperty(i)) {
            possibleCompletions.push(i);
        }
    }
    return possibleCompletions;
};


Calculate.applyMemoryVar = function(name, value) {
    if (typeof name === "string" && typeof value == "string") {
        Calculate.evaluate(name + "=" + value);
    }
};

Calculate.calc = function(expression) {
    // Apply conversions.
    // a! -> factorial(a)
    // a^b -> pow(a,b)
    const input = new org.antlr.runtime.ANTLRStringStream(expression);
    const lexer = new ECMAScript3ExtLexer(input);
    const tokens = new org.antlr.runtime.CommonTokenStream(lexer);
    const parser = new ECMAScript3ExtParser(tokens);
    const t = parser.program().getTree();
    const n = lexer.getNumberOfSyntaxErrors() + parser.getNumberOfSyntaxErrors();
    
    if (t != null && n == 0) {
        const emitter = new ECMAScript3ExtEmitter();
        emitter.includeWhitespace = false;
        expression = emitter.emit(t);
        //Calculate.log("Converted to: " + expression);
    }
    
    const answer = Calculate.evaluate(expression);
    if (typeof answer === "function") {
        return "Function defined";
    } else {
        Calculate.sandbox["ans"] = answer;
        return Calculate.valueToString(answer);
    }
};

Calculate.angleScale = 1;

Calculate.setAngleMode = function(v) {
    Calculate.angleScale = (v !== 1) ? 1 : (Math.PI / 180);
};

/**
    Math functions.
*/
Calculate.Math = Object.freeze({
    // Constants
    \u03c0:   Math.PI,
    pi:       Math.PI,
    e:        Math.E,

    // Constants in case user likes the JavaScript Math class.
    PI:       Math.PI,
    E:        Math.E,

    // Basic Math
    abs:      Math.abs,
    ceil:     Math.ceil,
    floor:    Math.floor,
    max:      Math.max,
    min:      Math.min,
    pow:      Math.pow,
    random:   Math.random,
    round:    Math.round,
    sqrt:     Math.sqrt,

    // Bitwise
    // Because ^ is used as power, and having the emitter convert to ^ would
    // be confusing for people who expect that to be the power operator.
    xor:      function(a,b) { return a ^ b; },

    // Log functions
    exp:      Math.exp,
    log:      Math.log,
    ln:       Math.log,
    log10:    function(x) { return Math.log(x) / Math.log(10); },
    log2:     function(x) { return Math.log(x) / Math.log(2); },

    // Trig
    cos:      function(x) { x *= Calculate.angleScale; return Math.cos(x); },
    sin:      function(x) { x *= Calculate.angleScale; return Math.sin(x); },
    tan:      function(x) { x *= Calculate.angleScale; return Math.tan(x); },
    cot:      function(x) { x *= Calculate.angleScale; return 1 / Math.tan(x); },
    sec:      function(x) { x *= Calculate.angleScale; return 1 / Math.cos(x); },
    csc:      function(x) { x *= Calculate.angleScale; return 1 / Math.sin(x); },

    acos:     function(x) { return Math.acos(x) / Calculate.angleScale; },
    asin:     function(x) { return Math.asin(x) / Calculate.angleScale; },
    atan:     function(x) { return Math.atan(x) / Calculate.angleScale; },
    atan2:    function(y, x) { return Math.atan2(y, x) / Calculate.angleScale; },
    acot:     function(x) { return Math.atan(1 / x) / Calculate.angleScale; },
    asec:     function(x) { return Math.acos(1 / x) / Calculate.angleScale; },
    acsc:     function(x) { return Math.asin(1 / x) / Calculate.angleScale; },

    // Hyperbolic functions
    sinh:     function(x) { x *= Calculate.angleScale; return (Math.exp(x) - Math.exp(-x)) / 2; },
    cosh:     function(x) { x *= Calculate.angleScale; return (Math.exp(x) + Math.exp(-x)) / 2; },
    tanh:     function(x) { x *= Calculate.angleScale; return this.sinh(x) / this.cosh(x); },
    coth:     function(x) { x *= Calculate.angleScale; return 1 / this.tanh(x); },
    sech:     function(x) { x *= Calculate.angleScale; return 1 / this.cosh(x); },
    csch:     function(x) { x *= Calculate.angleScale; return 1 / this.sinh(x); },

    asinh:    function(x) { return Math.log(x + Math.sqrt(x * x + 1)) / Calculate.angleScale; },
    acosh:    function(x) { return Math.log(x + Math.sqrt(x * x - 1)) / Calculate.angleScale; },
    atanh:    function(x) { return 0.5 * Math.log((1 + x) / (1 - x)) / Calculate.angleScale; },
    acoth:    function(x) { return 0.5 * Math.log((x + 1) / (x - 1)) / Calculate.angleScale; },
    asech:    function(x) { return Math.log(1 / x + Math.sqrt(1 / (x * x) + 1)) / Calculate.angleScale; },
    acsch:    function(x) { return Math.log(1 / x + Math.sqrt(1 / (x * x) - 1)) / Calculate.angleScale; },
    
    factorial: function(n) {
        // Factorial based on code from http://www.univie.ac.at/future.media/moe/JavaCalc/jcintro.html

        function loggamma(x) {
            let v = 1;
            while (x < 8) {
                v *= x;
                x++;
            }
            let w = 1 / (x * x);
            return ((((((((-3617 / 122400) * w + 7 / 1092) * w
                -691 / 360360) * w + 5 / 5940) * w
                -1 / 1680) * w + 1 / 1260) * w
                -1 / 360) * w + 1 / 12) / x + 0.5 * Math.log(2 * Math.PI) -
                Math.log(v) - x + (x - 0.5) * Math.log(x);
        }

        function gamma(x) {
            if (x <= 0) {
                if (Math.abs(x) - Math.floor(Math.abs(x)) === 0) {
                    return Infinity;
                } else {
                    return Math.PI / (Math.sin(Math.PI * x) * Math.exp(loggamma(1 - x)));
                }
            } else {
                return Math.exp(loggamma(x));
            }
        }

        if (n < 0) {
            return gamma(n + 1);
        } else if (n === 0 || n === 1) {
            return 1;
        } else if (Math.abs(n) - Math.floor(Math.abs(n)) === 0) {
            let result = 1;
            for (let i = 2; i <= n; i++) {
                result *= i;
            }
            return result;
        } else {
            return gamma(n + 1);
        }
    }
});
