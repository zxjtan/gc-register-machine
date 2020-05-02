
const evaluator_machine = make_machine(registers, ops, controller);

function test(P, expected_result, heap_size) {
    evaluator_machine("install_parsetree")(P);
    set_register_contents(evaluator_machine, "SIZE", heap_size);
    start(evaluator_machine);
    assert_equal(get_contents("val"), expected_result);
}

// single number
let code = "1;";
let P = parse(code);
test(P, code, "8", "100");


code = "true;";
P = parse(code);
test(P, code, "true", "100");

// undefined variable
code = "a;";
P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
// should throw exception


// sinmple arithmetic
code = "1 + 1;";
P = parse(code);
test(P, code, "2", "100");

code = "1 - 1;";
P = parse(code);
test(P, code, "0", "100");

code = "4/ 2;";
P = parse(code);
test(P, code, "2", "100");

code = "6 * 6;";
P = parse(code);
test(P, code, "36", "100");

code = "6 === 6;";
P = parse(code);
test(P, code, "true", "100");

code = "6 >= 6;";
P = parse(code);
test(P, code, "true", "100");

code = "6 > 6;";
P = parse(code);
test(P, code, "false", "100");

code = "6 <= 6;";
P = parse(code);
test(P, code, "true", "100");

code = "6 < 6;";
P = parse(code);
test(P, code, "false", "100");


code = "!false;";
P = parse(code);
test(P, code, "true", "100");

// function 
code = "     \
function f(x) {             \
    return x + 1;           \
}                           \
f(2);                       ";

P = parse(code);
test(P, code, "3", "100");


code = "             \
const a = 2;                        \
const b = 7;                        \
function f(x, y) {                  \
    const c = 100;                  \
    const d = 500;                  \
    return x - y * a + b - c + d;   \
}                                   \
f(30, 10);                          ";
P = parse(code);
test(P, code, "417", "100");

code = "         \
function factorial(n) {         \
    return n === 1 ? 1          \
        : n * factorial(n - 1); \
}                               \
factorial(4);                   ";
P = parse(code);
test(P, code, "24", "100");


code = "         \
const about_pi = 3;             \
function square(x) {            \
    return x * x;               \
}                               \
4 * about_pi * square(6371);    ";
P = parse(code);
test(P, code, "487075692", "100");


code = "\
function power(x, y) {            \
    return y === 0                \
        ? 1                       \
        : x * power(x, y - 1);    \
}                                 \
power(17, 1);                     ";

P = parse(code);
test(P, code, "17", "100");

code = "\
function x(a) {         \
  const b = 2*a;        \
  function y() {        \
      return b + 1;     \
  }                     \
  return y;             \
}                       \
x(2)();                 ";

P = parse(code);
test(P, code, "5", "100");
