
const evaluator_machine = make_evaluator_machine(10000);
const code = "const a";
const P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
// exception
