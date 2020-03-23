function is_tagged_list(stmt, the_tag) {
    return is_pair(stmt) && head(stmt) === the_tag;
}

function is_self_evaluating(stmt) {
    return is_number(stmt) || is_boolean(stmt) || is_undefined(stmt);
}

function is_variable(x) {
    return is_string(x);
}
// or ?
function is_variable_declaration(stmt) {
    return is_tagged_list(stmt, "variable_declaration");
}

// self make
function is_quoted(x) {
    return is_tagged_list(x, "quoted");
}


function is_assignment(stmt) {
    return is_tagged_list(stmt, "assignment");
}

// self make
function is_definition(stmt) {
    return is_tagged_list(stmt, "definition");
}

function is_conditional_expression(stmt) {
    return is_tagged_list(stmt, "conditional_expression");
}

// self make
function is_function_expression(stmt) {
    return is_tagged_list(stmt, "function_expression");
}

function is_block(stmt) {
    return is_tagged_list(stmt, "block")
}
function is_application(stmt) {
    return is_tagged_list(stmt, "application");
}

list(list("is_self_evaluating", primitive_function(is_self_evaluating),
    list("is_variable", primitive_function(is_variable)),
    list("is_quoted", primitive_function(is_quoted)),
    list("is_assignment", primitive_function(is_assignment)),
    list("is_definition", primitive_function(is_definition)),
    list("is_conditional_expression", primitive_function(is_conditional_expression)),
    list("is_function_expression", primitive_function(is_function_expression)),
    list("is_block", primitive_function(is_block)),
    list("is_application", primitive_function(is_application))));

const eval_dispatch = list(
    "eval_dispatch",
    test(op("is_self_evaluating"), reg("exp")),
    branch(label("ev_self_eval")),
    test(op("is_variable"), reg("exp")),
    branch(label("ev_variable")),
    test(op("is_quoted"), reg("exp")),
    branch(label("ev_quoted")), /// FIXME
    test(op("is_assignment"), reg("exp")),
    branch(label("ev_assignment")),
    test(op("is_definition"), reg("exp")),
    branch(label("ev_definition")),
    test(op("is_conditional_expression"), reg("exp")),
    branch(label("ev_if")),
    test(op("is_function_expression"), reg("exp")),
    branch(label("ev_lambda")),
    test(op("is_block"), reg("exp")),
    branch(label("ev_begin")),
    test(op("is_application"), reg("exp")),
    branch(label("ev_application")),
    go_to(label("unknown_expression_type"))
);

// Evaluating simple expressions
const eval_self = list(
    "ev_self_eval",
    assign("val", reg("exp")),
    go_to(reg("continue")));

const eval_var = list(
    "ev_variable",
    assign("val", list(op("lookup_variable_value"), reg("exp"), reg("env"))),
    go_to(reg("continue"))); 0

const eval_quoted = list(
    "ev_quoted",
    assign("val", list(op("text_of_quotation"), reg("exp"))),
    go_to(reg("continue")));

const eval_lambda = list(
    "ev_lambda",
    assign("unev", list(op("lambda_parameters"), reg("exp"))),
    assign("exp", op("lambda_body"), reg("exp")),
    assign("val", list(op("make_procedure"), reg("unev"), reg("exp"), reg("env"))),
    go_to(reg("continue")));

// Evaluating function applications
const eval_application = list(
    "const ev_application",
    save("continue"),
    save("env"),
    assign("unev", list(op("operands"), reg("exp"))),
    save("unev"),
    assign("exp", list(op("operator"), reg("exp"))),
    assign("continue", label("ev_appl_did_operator")),
    go_to(label("eval_dispatch")));


const eval_appl_operator = list(
    "ev_appl_did_operator",
    restore("unev"),                  // the operands
    restore("env"),
    assign("argl", list(op("empty_arglist"))),
    assign("fun", reg("val")),       // the operator
    test(op("has_no_operands"), reg("unev")),
    branch(label("apply_dispatch")),
    save("fun"));

const eval_operand_loop = list(
    "ev_appl_operand_loop",
    save("argl"),
    assign("exp", list(op("first_operand"), reg("unev"))),
    test(op("is_last_operand"), reg("unev")),
    branch(label("ev_appl_last_arg")),
    save("env"),
    save("unev"),
    assign("continue", label("ev_appl_accumulate_arg")),
    go_to(label("eval_dispatch")));

const eval_appl_accumlate_arg = list(
    "ev_appl_accumulate_arg",
    restore("unev"),
    restore("env"),
    restore("argl"),
    assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
    assign("unev", list(op("rest_operands"), reg("unev"))),
    go_to(label("ev_appl_operand_loop")));


const eval_appl_last_arg = list(
    "ev_appl_last_arg",
    assign("continue", label("ev_appl_accum_last_arg")),
    go_to(label("eval_dispatch")));

// Function application
const eval_appl_accum_last_arg = list(
    "ev_appl_accum_last_arg",
    restore(argl),
    assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
    restore("fun"),
    go_to(label("apply_dispatch")));

const apply_dispatch = list(
    "apply_dispatch",
    test(op("is_primitive_procedure"), reg("fun")),
    branch(label("primitive_apply")),
    test(op("is_compound_procedure"), reg("fun")),
    branch(label("compound_apply")),
    go_to(label("unknown_procedure_type")));


const primitive_apply = list(
    "primitive_apply",
    assign("val", list(op("apply_primitive_procedure"), reg("fun"), reg("argl"))),
    restore("continue"),
    go_to(reg("continue")));

const compound_apply = list(
    "compound_apply",
    assign("unev", list(op("procedure_parameters"), reg("fun"))),
    assign("env", list(op("procedure_environment"), reg("fun"))),
    assign("env", list(op("extend_environment"), reg("unev"), reg("argl"), reg("env"))),
    assign("unev", list(op("procedure_body"), reg("fun"))),
    go_to(label("ev_sequence")));

// env elements
const primitive_unary_functions =
    list(list("!", primitive_function((a) => !a)));

const primitive_binary_functions =
    list(list("+", primitive_function((a, b) => a + b)),
        list("-", primitive_function((a, b) => a - b)),
        list("*", primitive_function((a, b) => a * b)),
        list("/", primitive_function((a, b) => a / b)),
        list("===", primitive_function((a, b) => a === b)),
        list("!==", primitive_function((a, b) => a !== b)),
        list("<", primitive_function((a, b) => a < b)),
        list("<=", primitive_function((a, b) => a <= b)),
        list(">", primitive_function((a, b) => a > b)),
        list(">=", primitive_function((a, b) => a >= b)),
        list("&&", primitive_function((a, b) => a && b)),
        list("||", primitive_function((a, b) => a || b)));

const primitive_constants =
    list(list("undefined", undefined_type),
        list("math_PI", number_type)
    );