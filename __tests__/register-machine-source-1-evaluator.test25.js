
set_register_contents(evaluator_machine, "SIZE", 100000);
const code = "const a";
const P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
// exception
