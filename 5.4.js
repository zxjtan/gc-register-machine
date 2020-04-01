function is_tagged_list(stmt, the_tag) {
    return is_pair(stmt) && head(stmt) === the_tag;
}

function is_self_evaluating(stmt) {
    return is_number(stmt) || is_boolean(stmt) || is_undefined(stmt);
}

function is_name(stmt) {
    return is_tagged_list(stmt, "name");
}

function is_constant_declaration(stmt) {
    return is_tagged_list(stmt, "constant_declaration");
}

function is_variable_declaration(stmt) {
    return is_tagged_list(stmt, "variable_declaration");
}

function is_assignment(stmt) {
    return is_tagged_list(stmt, "assignment");
}

function is_conditional_expression(stmt) {
    return is_tagged_list(stmt, "conditional_expression");
}

// self make
function is_function_definition(stmt) {
    return is_tagged_list(stmt, "function_definition");
}

function is_application(stmt) {
    return is_tagged_list(stmt, "application");
}

list(list("is_self_evaluating", primitive_function(is_self_evaluating),
    list("is_name", primitive_function(is_name)),
    list("is_constant_declaration", primitive_function(is_constant_declaration)),
    list("is_variable_declaration", primitive_function(is_variable_declaration)),
    list("is_assignment", primitive_function(is_assignment)),
    list("is_conditional_expression", primitive_function(is_conditional_expression)),
    list("is_function_definition", primitive_function(is_function_definition)),
    list("is_application", primitive_function(is_application))));

const eval_dispatch = list(
    "eval_dispatch",
    test(op("is_self_evaluating"), reg("exp")),
    branch(label("ev_self_eval")),
    test(op("is_name"), reg("exp")),
    branch(label("ev_name")),
    test(op("is_constant_declaration"), reg("exp")),
    branch(label("ev_constant_declaration")),
    test(op("is_variable_declaration"), reg("exp")),
    branch(label("ev_variable_declaration")),
    test(op("is_assignment"), reg("exp")),
    branch(label("ev_assignment")),
    test(op("is_conditional_expression"), reg("exp")),
    branch(label("ev_if")),
    test(op("is_function_definition"), reg("exp")),
    branch(label("ev_lambda")),
    test(op("is_sequence"), reg("exp")),
    branch(label("ev_sequence")),
    test(op("is_application"), reg("exp")),
    branch(label("ev_application")),
    go_to(label("unknown_expression_type"))
);

// Evaluating simple expressions
const eval_self = list(
    "ev_self_eval",
    assign("val", reg("exp")),
    go_to(reg("continue")));

const eval_name = list(
    "ev_name",
    assign("val", list(op("lookup_variable_value"), reg("exp"), reg("env"))),
    go_to(reg("continue")));

const eval_lambda = list(
    "ev_lambda",
    assign("unev", list(op("lambda_parameters"), reg("exp"))),
    assign("exp", op("lambda_body"), reg("exp")),
    assign("val", list(op("make_procedure"), reg("unev"), reg("exp"), reg("env"))),
    go_to(reg("continue")));

// Evaluating function applications
const eval_application = list(
    "ev_application",
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

function install_parsetree(the_heads, the_tails, parsetree) {
    let free = 0;
    function helper(parsetree) {
        if (!is_pair(parsetree)) {
            return wrap_ptr(parsetree);
        } else {
            const index = free;
            free = free + 1;
            const elem = head(parsetree);
            the_heads[index] = helper(elem);
            the_tails[index] = helper(tail(parsetree));
            return make_prog_ptr(index);
        }
    }
    helper(parsetree);
}




// env related

/* THE GLOBAL ENVIRONMENT */
const the_global_environment = setup_environment();
const the_empty_environment = null;

function setup_environment() {
    const primitive_function_names =
        map(f => head(f), primitive_functions);
    const primitive_function_values =
        map(f => make_primitive_function(head(tail(f))),
            primitive_functions);
    const primitive_constant_names =
        map(f => head(f), primitive_constants);
    const primitive_constant_values =
        map(f => head(tail(f)),
            primitive_constants);
    return extend_environment(
        append(primitive_function_names,
            primitive_constant_names),
        append(primitive_function_values,
            primitive_constant_values),
        the_empty_environment);
}

// extend env
function extend_environment(names, vals, base_env) {
    if (length(names) === length(vals)) {
        return enclose_by(
            make_frame(names,
                map(x => pair(x, true), vals)),
            base_env);
    } else if (length(names) < length(vals)) {
        error("Too many arguments supplied: " +
            stringify(names) + ", " +
            stringify(vals));
    } else {
        error("Too few arguments supplied: " +
            stringify(names) + ", " +
            stringify(vals));
    }
}


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

// the global environment also has bindings for all
// primitive non-function values, such as undefined and 
// math_PI

const primitive_constants = list(
    list("undefined", undefined),
    list("math_PI", math_PI)
);

// primitive functions are tagged with "primitive"      
// and come with a Source function "implementation"

function make_primitive_function(impl) {
    return list("primitive", impl);
}
function is_primitive_function(fun) {
    return is_tagged_list(fun, "primitive");
}
function primitive_implementation(fun) {
    return list_ref(fun, 1);
}

// frames are pairs with a list of names as head
// an a list of pairs as tail (values). Each value 
// pair has the proper value as head and a flag
// as tail, which indicates whether assignment
// is allowed for the corresponding name

function make_frame(names, values) {
    return pair(names, values);
}
function frame_names(frame) {
    return head(frame);
}
function frame_values(frame) {
    return tail(frame);
}

// The first frame in an environment is the
// "innermost" frame. The tail operation
// takes you to the "enclosing" environment

function first_frame(env) {
    return head(env);
}
function enclosing_environment(env) {
    return tail(env);
}
function enclose_by(frame, env) {
    return pair(frame, env);
}
function is_empty_environment(env) {
    return is_null(env);
}

// function application needs to distinguish between
// primitive functions (which are evaluated using the
// underlying JavaScript), and compound functions.
// An application of the latter needs to evaluate the
// body of the function value with respect to an 
// environment that results from extending the function
// object's environment by a binding of the function
// parameters to the arguments and of local names to
// the special value no_value_yet

function apply(fun, args) {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(fun, args);
    } else if (is_compound_function(fun)) {
        const body = function_body(fun);
        const locals = local_names(body);
        const names = insert_all(function_parameters(fun),
            locals);
        const temp_values = map(x => no_value_yet,
            locals);
        const values = append(args, temp_values);
        const result =
            evaluate(body,
                extend_environment(
                    names,
                    values,
                    function_environment(fun)));
        if (is_return_value(result)) {
            return return_value_content(result);
        } else {
            return undefined;
        }
    } else {
        error(fun, "Unknown function type in apply");
    }
}

// set_name_value is used for let and const to give
// the initial value to the name in the first
// (innermost) frame of the given environment

function set_name_value(name, val, env) {
    function scan(names, vals) {
        return is_null(names)
            ? error("internal error: name not found")
            : name === head(names)
                ? set_head(head(vals), val)
                : scan(tail(names), tail(vals));
    }
    const frame = first_frame(env);
    return scan(frame_names(frame),
        frame_values(frame));
}

// name lookup proceeds from the innermost
// frame and continues to look in enclosing
// environments until the name is found

function lookup_name_value(name, env) {
    function env_loop(env) {
        function scan(names, vals) {
            return is_null(names)
                ? env_loop(
                    enclosing_environment(env))
                : name === head(names)
                    ? head(head(vals))
                    : scan(tail(names), tail(vals));
        }
        if (is_empty_environment(env)) {
            error(name, "Unbound name: ");
        } else {
            const frame = first_frame(env);
            const value = scan(frame_names(frame),
                frame_values(frame));
            if (value === no_value_yet) {
                error(name, "Name used before declaration: ");
            } else {
                return value;
            }
        }
    }
    return env_loop(env);
}

// to assign a name to a new value in a specified environment,
// we scan for the name, just as in lookup_name_value, and
// change the corresponding value when we find it,
// provided it is tagged as mutable

function assign_name_value(name, val, env) {
    function env_loop(env) {
        function scan(names, vals) {
            return is_null(names)
                ? env_loop(
                    enclosing_environment(env))
                : name === head(names)
                    ? (tail(head(vals))
                        ? set_head(head(vals), val)
                        : error("no assignment " +
                            "to constants allowed"))
                    : scan(tail(names), tail(vals));
        }
        if (is_empty_environment(env)) {
            error(name, "Unbound name in assignment: ");
        } else {
            const frame = first_frame(env);
            return scan(frame_names(frame),
                frame_values(frame));
        }
    }
    return env_loop(env);
}