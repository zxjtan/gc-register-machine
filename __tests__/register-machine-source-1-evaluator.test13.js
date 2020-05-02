
set_register_contents(evaluator_machine, "SIZE", 100000);
const code = "!false;";
const P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
// ["bool", "true"]