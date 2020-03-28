// all other statements and expressions are
// tagged lists. Their tag tells us what
// kind of statement/expression they are
function is_tagged_list(stmt, the_tag) {
    return is_pair(stmt) && head(stmt) === the_tag;
}

// constants (numbers, strings, booleans)
// are considered "self_evaluating". This means, they
// represent themselves in the syntax tree
function is_self_evaluating(stmt) {
    return is_number(stmt) || is_boolean(stmt) || is_undefined(stmt);
}

/* NAMES */

// Names are tagged with "name".
// In this evaluator, typical names
// are 
// list("name", "+")
// list("name", "factorial")
// list("name", "n")
function is_name(stmt) {
    return is_tagged_list(stmt, "name");
}
function name_of_name(stmt) {
    return head(tail(stmt));
}


/* CONSTANT DECLARATIONS */

// constant declarations are tagged with "constant_declaration"
// and have "name" and "value" properties

function is_constant_declaration(stmt) {
    return is_tagged_list(stmt, "constant_declaration");
}
function constant_declaration_name(stmt) {
    return head(tail(head(tail(stmt))));
}
function constant_declaration_value(stmt) {
    return head(tail(tail(stmt)));
}

// evaluation of a constant declaration evaluates
// the right-hand expression and binds the
// name to the resulting value in the
// first (innermost) frame

function eval_constant_declaration(stmt, env) {
    set_name_value(constant_declaration_name(stmt),
        eval(constant_declaration_value(stmt), env),
        env);
}

/* VARIABLE DECLARATIONS */

function is_variable_declaration(stmt) {
    return is_tagged_list(stmt, "variable_declaration");
}
function variable_declaration_name(stmt) {
    return head(tail(head(tail(stmt))));
}
function variable_declaration_value(stmt) {
    return head(tail(tail(stmt)));
}

const eval_variable_declaration = list(
    "eval_variable_declaration",

)
function eval_variable_declaration(stmt, env) {
    set_name_value(variable_declaration_name(stmt),
        evaluate(variable_declaration_value(stmt), env),
        env);
}

/* CONDITIONAL EXPRESSIONS */

// conditional expressions are tagged
// with "conditional_expression"
const is_conditional_expression = list(
    "is_conditional_expression",
    assign("val", list(op("is_tagged_list"), reg("exp")))
)
function is_conditional_expression(stmt) {
    return is_tagged_list(stmt,
        "conditional_expression");
}
const cond_expr_pred = list(
    "cond_expr_pred",
    assign("val", list(op("vector_ref"), reg("list_ref"), reg("exp"), constant(1)))
)
function cond_expr_pred(stmt) {
    return list_ref(stmt, 1);
}
const cond_expr_cons = list(
    "cond_expr_cons",
    assign("val", list(op("vector_ref"), reg("list_ref"), reg("exp"), constant(2)))
)

function cond_expr_cons(stmt) {
    return list_ref(stmt, 2);
}
const cond_expr_alt = list(
    "cond_expr_alt",
    assign("val", list(op("vector_ref"), reg("list_ref"), reg("exp"), reg(constant(3))))
)
function cond_expr_alt(stmt) {
    return list_ref(stmt, 3);
}
const is_true = list(
    "is_true",
    assign("val", list(op("==="), contant(true), reg("val")))
)
function is_true(x) {
    return x === true;
}

// the meta-circular evaluation of conditional expressions
// evaluates the predicate and then the appropriate
// branch, depending on whether the predicate evaluates to
// true or not
const eval_conditional_expression = list(
    "eval_conditional_expression",
    assign("val", list(op("eval_dispatch"), reg("exp"))),
    test(list(op("is_true"), reg("val"))),
    assgin("val", list(op("cond_expr_cons"), reg("exp"))),
    assgin("val", list(op("cond_expr_alt"), reg("exp"))),
    assgin("val", list(op("eval_dispatch"), reg("val")))
)

function eval_conditional_expression(stmt, env) {
    return is_true(evaluate(cond_expr_pred(stmt),
        env))
        ? evaluate(cond_expr_cons(stmt), env)
        : evaluate(cond_expr_alt(stmt), env);
}

/* FUNCTION DEFINITION EXPRESSIONS */

// function definitions are tagged with "function_definition"
// have a list of "parameters" and a "body" statement

function is_function_definition(stmt) {
    return is_tagged_list(stmt, "function_definition");
}
function function_definition_parameters(stmt) {
    return head(tail(stmt));
}
function function_definition_body(stmt) {
    return head(tail(tail(stmt)));
}

// compound function values keep track of parameters, body
// and environment, in a list tagged as "compound_function"

function make_compound_function(parameters, body, env) {
    return list("compound_function",
        parameters, body, env);
}
function is_compound_function(f) {
    return is_tagged_list(f, "compound_function");
}
function function_parameters(f) {
    return list_ref(f, 1);
}
function function_body(f) {
    return list_ref(f, 2);
}
function function_environment(f) {
    return list_ref(f, 3);
}

// evluating a function definition expression
// results in a function value. Note that the
// current environment is stored as the function
// value's environment

function eval_function_definition(stmt, env) {
    return make_compound_function(
        map(name_of_name,
            function_definition_parameters(stmt)),
        function_definition_body(stmt),
        env);
}

/* SEQUENCES */

// sequences of statements are just represented
// by tagged lists of statements by the parser.

function is_sequence(stmt) {
    return is_tagged_list(stmt, "sequence");
}
function make_sequence(stmts) {
    return list("sequence", stmts);
}
function sequence_statements(stmt) {
    return head(tail(stmt));
}
function is_empty_sequence(stmts) {
    return is_null(stmts);
}
function is_last_statement(stmts) {
    return is_null(tail(stmts));
}
function first_statement(stmts) {
    return head(stmts);
}
function rest_statements(stmts) {
    return tail(stmts);
}

// to evaluate a sequence, we need to evaluate
// its statements one after the other, and return
// the value of the last statement. 
// An exception to this rule is when a return
// statement is encountered. In that case, the
// remaining statements are ignored and the 
// return value is the value of the sequence.

function eval_sequence(stmts, env) {
    if (is_empty_sequence(stmts)) {
        return undefined;
    } else if (is_last_statement(stmts)) {
        return evaluate(first_statement(stmts), env);
    } else {
        const first_stmt_value =
            evaluate(first_statement(stmts), env);
        if (is_return_value(first_stmt_value)) {
            return first_stmt_value;
        } else {
            return eval_sequence(
                rest_statements(stmts), env);
        }
    }
}

/* FUNCTION APPLICATION */

// The core of our evaluator is formed by the
// implementation of function applications.
// Applications are tagged with "application"
// and have "operator" and "operands"

function is_application(stmt) {
    return is_tagged_list(stmt, "application");
}
function operator(stmt) {
    return head(tail(stmt));
}
function operands(stmt) {
    return head(tail(tail(stmt)));
}
function no_operands(ops) {
    return is_null(ops);
}
function first_operand(ops) {
    return head(ops);
}
function rest_operands(ops) {
    return tail(ops);
}

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

/* APPLY */

// apply_in_underlying_javascript allows us
// to make use of JavaScript's primitive functions
// in order to access operators such as addition

function apply_primitive_function(fun, argument_list) {
    return apply_in_underlying_javascript(
        primitive_implementation(fun),
        argument_list);
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

// We use a nullary function as temporary value for names whose
// declaration has not yet been evaluated. The purpose of the
// function definition is purely to create a unique identity;
// the function will never be applied and its return value 
// (null) is irrelevant.
const no_value_yet = () => null;

// The function local_names collects all names declared in the
// body statements. For a name to be included in the list of
// local_names, it needs to be declared outside of any other
// block or function.

function insert_all(xs, ys) {
    return is_null(xs)
        ? ys
        : is_null(member(head(xs), ys))
            ? pair(head(xs), insert_all(tail(xs), ys))
            : error(head(xs), "multiple declarations of: ");
}

function local_names(stmt) {
    if (is_sequence(stmt)) {
        const stmts = sequence_statements(stmt);
        return is_empty_sequence(stmts)
            ? null
            : insert_all(
                local_names(first_statement(stmts)),
                local_names(make_sequence(
                    rest_statements(stmts))));
    } else {
        return is_constant_declaration(stmt)
            ? list(constant_declaration_name(stmt))
            : is_variable_declaration(stmt)
                ? list(variable_declaration_name(stmt))
                : null;
    }
}

/* RETURN STATEMENTS */

// functions return the value that results from
// evaluating their expression

function is_return_statement(stmt) {
    return is_tagged_list(stmt, "return_statement");
}
function return_statement_expression(stmt) {
    return head(tail(stmt));
}

// since return statements can occur anywhere in the
// body, we need to identify them during the evaluation
// process

function make_return_value(content) {
    return list("return_value", content);
}
function is_return_value(value) {
    return is_tagged_list(value, "return_value");
}
function return_value_content(value) {
    return head(tail(value));
}
function eval_return_statement(stmt, env) {
    return make_return_value(
        evaluate(return_statement_expression(stmt),
            env));
}

/* ASSIGNMENT */

function is_assignment(stmt) {
    return is_tagged_list(stmt, "assignment");
}
function assignment_name(stmt) {
    return head(tail(head(tail(stmt))));
}
function assignment_value(stmt) {
    return head(tail(tail(stmt)));
}
function eval_assignment(stmt, env) {
    const value = evaluate(assignment_value(stmt), env);
    assign_name_value(assignment_name(stmt), value, env);
    return value;
}

/* ENVIRONMENTS */

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

// set_name_value is used for let and const to give
// the initial value to the name in the first
// (innermost) frame of the given environment
const set_name_value = list(
    "set_name_value",
    assign("frame", list(op("first_frame"), reg("env"))),
    assign("names", list(op("frame_names"), reg("frame"))),
    assign("values", list(op("frame_values"), reg("frame"))),
    assign("val", list(op("scan_frame"), reg("names"), reg("values")))
)
const scan_frame = list(
    "scan_frame",
    test(list(op("==="), reg("names"), constant(null))),
    go_to(label("internal_error")),
    assign("val", list(op("get_head"), reg("names"))),
    assign("val", list(op("get_head"), reg("values"))),
    perform(list(op("set_head")))
)
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

// applying a compound function to parameters will
// lead to the creation of a new environment, with
// respect to which the body of the function needs
// to be evaluated
// (also used for blocks)
const extend_environment =
    list("extend_environment",
        test(list(op("is_same_len"), reg("a"), reg("b"))),
        assign("val", list(op("make_frame"), reg("a"), reg("b"))),
        assign("env", list(op("enclose_by"), reg("val"), reg("env"))),
        test(list(op("has_longer_values"), reg("a"), reg("b"))),
        go_to(label("too_many_arguments")),
        go_to(label("too_few_arguments"))
    )
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

/* EVALUATE */

// list_of_values evaluates a given list of expressions
// with respect to an environment

function list_of_values(exps, env) {
    if (no_operands(exps)) {
        return null;
    } else {
        return pair(evaluate(first_operand(exps), env),
            list_of_values(rest_operands(exps), env));
    }
}

const op_list = list(
    list("is_self_evaluating", primitive_function(is_self_evaluating),
        list("is_name", primitive_function(is_name)),
        list("lookup_name_value", primitive_function(lookup_name_value)),
        list("name_of_name", primitive_function(name_of_name)),
        list("is_constant_declaration", primitive_function(is_constant_declaration)),
        list("eval_constant_declaration", primitive_function(eval_constant_declaration)),
        list("is_variable_declaration", primitive_function(is_variable_declaration)),
        list("eval_variable_declaration", primitive_function(eval_variable_declaration)),
        list("is_assignment", primitive_function(is_assignment)),
        list("is_conditional_expression", primitive_function(is_conditional_expression)),
        list("is_function_definition", primitive_function(is_function_definition)),
        list("is_application", primitive_function(is_application))));



// Evaluating simple expressions
const eval_self = list(
    "eval_self_eval",
    assign("val", reg("exp")),
    go_to(reg("continue")));

const eval_name = list(
    "eval_name",
    assign("val", list(op("lookup_name_value"), reg("exp"), reg("env"))),
    go_to(reg("continue")));

const eval_lambda = list(
    "eval_lambda",
    assign("unev", list(op("lambda_parameters"), reg("exp"))),
    assign("exp", op("lambda_body"), reg("exp")),
    assign("val", list(op("make_procedure"), reg("unev"), reg("exp"), reg("env"))),
    go_to(reg("continue")));

// Evaluating function applications
const eval_application = list(
    "eval_application",
    save("continue"),
    save("env"),
    assign("unev", list(op("operands"), reg("exp"))),
    save("unev"),
    assign("exp", list(op("operator"), reg("exp"))),
    assign("continue", label("eval_appl_did_operator")),
    go_to(label("eval_dispatch")));


const eval_appl_operator = list(
    "eval_appl_did_operator",
    restore("unev"),                  // the operands
    restore("env"),
    assign("argl", list(op("empty_arglist"))),
    assign("fun", reg("val")),       // the operator
    test(op("has_no_operands"), reg("unev")),
    branch(label("apply_dispatch")),
    save("fun"));

const eval_operand_loop = list(
    "eval_appl_operand_loop",
    save("argl"),
    assign("exp", list(op("first_operand"), reg("unev"))),
    test(op("is_last_operand"), reg("unev")),
    branch(label("eval_appl_last_arg")),
    save("env"),
    save("unev"),
    assign("continue", label("eval_appl_accumulate_arg")),
    go_to(label("eval_dispatch")));

const eval_appl_accumlate_arg = list(
    "eval_appl_accumulate_arg",
    restore("unev"),
    restore("env"),
    restore("argl"),
    assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
    assign("unev", list(op("rest_operands"), reg("unev"))),
    go_to(label("eval_appl_operand_loop")));


const eval_appl_last_arg = list(
    "eval_appl_last_arg",
    assign("continue", label("eval_appl_accum_last_arg")),
    go_to(label("eval_dispatch")));

// Function application
const eval_appl_accum_last_arg = list(
    "eval_appl_accum_last_arg",
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
    go_to(label("eval_sequence")));

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
            return make_ptr_ptr(index);
        }
    }
    helper(parsetree);
}



const eval_dispatch = list(
    "eval_dispatch",
    test(op("is_self_evaluating"), reg("exp")),
    branch(label("eval_self_eval")),
    test(op("is_name"), reg("exp")),
    branch(label("eval_name")),
    test(op("is_constant_declaration"), reg("exp")),
    branch(label("eval_constant_declaration")),
    test(op("is_variable_declaration"), reg("exp")),
    branch(label("eval_variable_declaration")),
    test(op("is_assignment"), reg("exp")),
    branch(label("eval_assignment")),
    test(op("is_conditional_expression"), reg("exp")),
    branch(label("eval_if")),
    test(op("is_function_definition"), reg("exp")),
    branch(label("eval_lambda")),
    test(op("is_sequence"), reg("exp")),
    branch(label("eval_sequence")),
    test(op("is_application"), reg("exp")),
    branch(label("eval_application")),
    go_to(label("unknown_expression_type"))
);

/* THE GLOBAL ENVIRONMENT */

const the_empty_environment = null;

// the minus operation is overloaded to
// support both binary minus and unary minus

function minus(x, y) {
    if (is_number(x) && is_number(y)) {
        return x - y;
    } else {
        return -x;
    }
}

// the global environment has bindings for all
// primitive functions, including the operators

const primitive_functions = list(
    list("display", display),
    list("error", error),
    list("+", (x, y) => x + y),
    list("-", (x, y) => minus(x, y)),
    list("*", (x, y) => x * y),
    list("/", (x, y) => x / y),
    list("%", (x, y) => x % y),
    list("===", (x, y) => x === y),
    list("!==", (x, y) => x !== y),
    list("<", (x, y) => x < y),
    list("<=", (x, y) => x <= y),
    list(">", (x, y) => x > y),
    list(">=", (x, y) => x >= y),
    list("!", x => !x)
);

// the global environment also has bindings for all
// primitive non-function values, such as undefined and 
// math_PI

const primitive_constants = list(
    list("undefined", undefined),
    list("math_PI", math_PI)
);

// setup_environment makes an environment that has
// one single frame, and adds a binding of all names
// listed as primitive_functions and primitive_values. 
// The values of primitive functions are "primitive" 
// objects, see line 281 how such functions are applied

function setup_environment(the_empty_environment) {
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

const vector_ops = list(
    list("vector_ref", ptr_aware_function(vector_ref)),
    list("vector_set", ptr_aware_function(vector_set)),
    list("display", primitive_function(display)),
    list("error", error),
    list("+", primitive_function((x, y) => x + y)),
    list("-", primitive_function((x, y) => x - y)),
    list("*", primitive_function((x, y) => x * y)),
    list("/", primitive_function((x, y) => x / y)),
    list("%", primitive_function((x, y) => x % y)),
    list("===", primitive_function((x, y) => x === y)),
    list("!==", primitive_function((x, y) => x !== y)),
    list("<", primitive_function((x, y) => x < y)),
    list("<=", primitive_function((x, y) => x <= y)),
    list(">", primitive_function((x, y) => x > y)),
    list(">=", primitive_function((x, y) => x >= y)),
    list("!", primitive_function(x => !x)),
    list("&&", primitive_function((x, y) => x && y)),
    list("||", primitive_function((x, y) => x || y)));

function primitive_function_names() {
    return map((func) => head(func), vector_ops);
}

const set_up_env = list(
    "set_up_env",
    assgin("env", list(op("setup_environment"), reg("env"))),
    go_to(label("eval")));

const eval = list(
    "eval",
    assign("val", list(op("eval_dispatch"), reg("Exp"), reg("env"))),
    test(op("is_return_value"), reg("val")),
    go_to(label("return_value_not_allow")));
