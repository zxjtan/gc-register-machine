
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

