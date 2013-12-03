/* 
 * Floating point precision fixer.
 * 
 * Could use real unit tests, but you can test in the widget by copying and 
 * pasting:
 
 [
    0.1+0.2      == 0.3 ,
    1.25-1.245   == 0.005 ,
    1.1-1        == 0.1 ,
    1.1-1.05     == 0.05 ,
    1.1-1.005    == 0.095 ,
    1.1-1.0005   == 0.0995 ,
    1-3          == -2 ,
    1.1-1.01     == 0.09 ,
    1.1-1.001    == 0.099 ,
    1.1-1.0001   == 0.0999 ,
    1.1-1.00001  == 0.09999 ,
    1.05*7       == 7.35 ,
    1.1*7        == 7.7 ,
    10.35/3      == 3.45 ,
]
*/
void function () {
    
    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
    
    function getSignificantDigits(n) {
        var s = Math.abs(n).toString().split("e")[0].split('.');
        
        // String before decimal. Remove leading zeroes
        var a = s[0].replace(/^0+/, '');
        // String after decimal. Remove trailing zeroes
        var b = s.length === 1 ? "" : s[1].replace(/0*$/, '');
        
        if (b.length === 0) {
            // Remove trailing zeroes
            return a.replace(/0*$/, '').length;
        }
        else if (a.length === 0) {
            // Remove leading zeroes
            return b.replace(/^0+/, '').length;
        }
        else {
            return a.length + b.length;
        }
    }

    Math.fixPrecision = function(n) {
        if (isNumber(n)) {
            // If the number has at least 15 significant digits, reduce the number of significant digits by 3.
            // If the resulting number has much less precision, then use it instead of the original number.
            var p = getSignificantDigits(n);
            if (p >= 15) {
                var n2 = parseFloat(n.toPrecision(p - 3));
                if (getSignificantDigits(n2) < p - 3) {
                    n = n2;
                }
            }
        }
        return n;
    };
    
    Math.add = function(x, y) {
        return Math.fixPrecision(x + y);
    };
    
    Math.sub = function(x, y) {
        return Math.fixPrecision(x - y);
    };
    
    Math.mul = function(x, y) {
        return Math.fixPrecision(x * y);
    };
    
    Math.div = function(x, y) {
        return Math.fixPrecision(x / y);
    };
    
    Math.mod = function(x, y) {
        return Math.fixPrecision(x % y);
    };
}();