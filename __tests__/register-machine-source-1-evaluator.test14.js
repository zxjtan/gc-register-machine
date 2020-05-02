
set_register_contents(evaluator_machine, "SIZE", 100000);
const code = "     \
function f(x) {             \
    return x + 1;           \
}                           \
f(2);                       ";
const P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
// ["number", 3]