
const evaluator_machine = make_evaluator_machine(10000);
const code = "\
function x(a) {         \
  const b = 2*a;        \
  function y() {        \
      return b + 1;     \
  }                     \
  return y;             \
}                       \
x(2)();                 ";
const P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
get_contents("val");
// ["number", 5]
