const evaluator_machine = make_machine(registers, ops, controller);


// single number
const code = "1;";
const P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "8");

code = "true;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "true");

// undefined variable
code = "a;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
// should throw exception


// sinmple arithmetic
code = "1 + 1;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "2");

code = "1 - 1;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "0");

code = "4/ 2;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "2");

code = "6 * 6;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "36");

code = "6 === 6;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "true");

code = "6 >= 6;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "true");

code = "6 > 6;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "false");

code = "6 <= 6;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "true");

code = "6 < 6;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "false");


code = "!false;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "true");

code = "false || true;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "true");


code = "false && true;";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "false");


// function 

code = "     \
function f(x) {             \
    return x + 1;           \
}                           \
f(2);                       ";

P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "3");


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
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "417");

code = "         \
function factorial(n) {         \
    return n === 1 ? 1          \
        : n * factorial(n - 1); \
}                               \
factorial(4);                   ";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "24");


code = "         \
const about_pi = 3;             \
function square(x) {            \
    return x * x;               \
}                               \
4 * about_pi * square(6371);    ";
P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "487075692");


code = "\
function power(x, y) {            \
    return y === 0                \
        ? 1                       \
        : x * power(x, y - 1);    \
}                                 \
power(17, 1);                     ";

P = parse(code);
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "17");

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
install_parsetree(evaluator_machine)(P);
start(evaluator_machine);
assert_equal(get_contents("val"), "5");
