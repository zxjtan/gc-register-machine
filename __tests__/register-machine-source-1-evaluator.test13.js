
const evaluator_machine = make_evaluator_machine(10000);
const code = "!false;";
const P = parse(code);
evaluator_machine("install_parsetree")(P);
start(evaluator_machine);
get_contents("val");
// ["bool", "true"]