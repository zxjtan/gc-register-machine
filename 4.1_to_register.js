// TYPED POINTERS

const NUMBER_TYPE = "number";
const BOOL_TYPE = "bool";
const STRING_TYPE = "string";
const PTR_TYPE = "ptr";
const PC_TYPE = "pc";
const NULL_TYPE = "null";
const UNDEFINED_TYPE = "undefined";

function make_ptr_ptr(idx) {
    return pair(PTR_TYPE, idx);
}

function make_null_ptr() {
    return pair(NULL_TYPE, null);
}

function make_prog_ptr(idx) {
    return pair(PC_TYPE, idx);
}

function get_elem_type(elem) {
    return is_number(elem) ? NUMBER_TYPE :
        is_boolean(elem) ? BOOL_TYPE :
        is_string(elem) ? STRING_TYPE :
        is_null(elem) ? NULL_TYPE :
        is_undefined(elem) ? UNDEFINED_TYPE :
        error(elem, "Invalid typed elem");
}

function wrap_ptr(elem) {
    return pair(get_elem_type(elem), elem);
}

function unwrap_ptr(ptr) {
    return tail(ptr);
}

function is_ptr(ptr) {
    return is_pair(ptr) &&
        !is_pair(head(ptr)) &&
        !is_pair(tail(ptr)) &&
        (head(ptr) === NUMBER_TYPE ||
        head(ptr) === BOOL_TYPE ||
        head(ptr) === STRING_TYPE ||
        head(ptr) === PTR_TYPE ||
        head(ptr) === NULL_TYPE ||
        head(ptr) === UNDEFINED_TYPE ||
        head(ptr) === PC_TYPE);
}

function is_number_ptr(ptr) {
    return is_ptr && head(ptr) === NUMBER_TYPE;
}

function is_bool_ptr(ptr) {
    return is_ptr(ptr) && head(ptr) === BOOL_TYPE;
}

function is_string_ptr(ptr) {
    return is_ptr(ptr) && head(ptr) === STRING_TYPE;
}

function is_ptr_ptr(ptr) {
    return is_ptr(ptr) && head(ptr) === PTR_TYPE;
}

function is_null_ptr(ptr) {
    return is_ptr(ptr) && head(ptr) === NULL_TYPE;
}

function is_undefined_ptr(ptr) {
    return is_ptr(ptr) && head(ptr) === UNDEFINED_TYPE;
}

function is_prog_ptr(ptr) {
    return is_ptr(ptr) && head(ptr) === PC_TYPE;
}

// CONTROLLER WRITING ABSTRACTIONS

const CONTROLLER_SEQ_HEADER = "controller_seq";

function make_controller_seq(seq) {
  return pair(CONTROLLER_SEQ_HEADER, seq);
}

function is_controller_seq(seq) {
    return is_pair(seq) && head(seq) === CONTROLLER_SEQ_HEADER;
}

const controller_seq_seq = tail;

function make_is_tagged_list_seq(exp, tag, label_text) {
    const before_label = "before_test_" + label_text;
    const seq = list(
        assign("a", exp),
        assign("b", tag),
        save("continue"),
        assign("continue", label(before_label)),
        go_to(label("is_tagged_list")),
        before_label,
        restore("continue"),
        test(op("==="), reg("res"), constant(true)),
        branch(label(label_text))
    );
    return make_controller_seq(seq);
}

function flatten_controller_seqs(controller_list) {
    if (is_null(controller_list)) {
        return null;
    } else {
        const seq = head(controller_list);
        return is_controller_seq(seq)
            ? append(controller_seq_seq(seq), flatten_controller_seqs(tail(controller_list)))
            : pair(seq, flatten_controller_seqs(tail(controller_list)));
    }
}


// PAIR OPERATIONS

const pair = list(
    "pair",
    save("continue"),
    assign("continue", label("pair_after_gc")),
    test(list(op("==="), reg("free"), reg("SIZE"))),
    branch(label("begin_garbage_collection")),
    "pair_after_gc",
    restore("continue"),
    perform(op("vector_set"), list(reg("the_heads"), reg("free"), reg("a"))),
    perform(op("vector_set"), list(reg("the_tails"), reg("free"), reg("b"))),
    assign("res", reg("free")),
    assign("free", list(op("inc_ptr"), reg("free")),
    go_to(reg("continue")))
);

const list = list(
    "list",
    assign("c", reg("a")),
    assign("b", list(op("make_null_ptr"))),
    "list_loop",
    test(list(op("==="), reg("c"), constant(0))),
    branch("list_return"),
    restore("a"),
    save("continue"),
    assign("continue", label("list_after_pair")),
    go_to(label("pair")),
    "list_after_pair",
    restore("continue"),
    assign("b", reg("res")),
    assign("c", list(op("-"), reg("c"), constant(1))),
    go_to(label("list_loop")),    
    "list_return",
    go_to("continue"),
);

const is_tagged_list = list(
    "is_tagged_list",
    test(list(op("is_ptr_ptr"), reg("a"))),
    branch(label("is_tagged_list_pair_true")),
    assign("res", constant(false)),
    go_to(reg("continue")),
    "is_tagged_list_pair_true",
    assign("a", list(op("vector_ref"), reg("the_heads"), reg("a"))),
    assign("res", list(op("==="), reg("a"), reg("b"))),
    go_to(reg("continue")),
);

// 5.4 code

const eval_dispatch = flatten_controller_seqs(list(
    "eval_dispatch",
    test(op("is_self_evaluating"), reg("exp")),
    branch(label("ev_self_eval")),
    make_is_tagged_list_seq(reg("exp"), constant("name"), "ev_name"),
    make_is_tagged_list_seq(reg("exp"), constant("constant_declaration"), "ev_constant_declaration"),
    make_is_tagged_list_seq(reg("exp"), constant("variable_declaration"), "ev_variable_declaration"),
    make_is_tagged_list_seq(reg("exp"), constant("assignment"), "assignment"),
    make_is_tagged_list_seq(reg("exp"), constant("conditional_expression"), "ev_if"),
    make_is_tagged_list_seq(reg("exp"), constant("function_definition"), "ev_lambda"),
    make_is_tagged_list_seq(reg("exp"), constant("sequence"), "ev_sequence"),
    make_is_tagged_list_seq(reg("exp"), constant("application"), "ev_application"),
    go_to(label("unknown_expression_type"))
));

const eval_self = list(
    "ev_self_eval",
    assign("val", reg("exp")),
    go_to(reg("continue"))
);

const eval_name = list(
    "ev_name",
    assign("a", list(op("vector_ref", reg("prog_tails"), reg("exp")))),
    assign("a", list(op("vector_ref", reg("prog_heads"), reg("a")))),
    assign("b", reg("env")),
    save("continue"),
    assign("continue", label("ev_name_after_lookup")),
    go_to(label("lookup_name_value")),
    "ev_name_after_lookup",
    restore("continue"),
    assign("val", reg("res")),
    go_to(reg("continue"))
);

const eval_lambda = list(
    "ev_lambda",
    assign("unev", list(op("vector_ref"), reg("prog_tails"), reg("exp"))),
    assign("unev", list(op("vector_ref"), reg("prog_heads"), reg("unev"))),
    assign("exp", list(op("vector_ref"), reg("prog_tails"), reg("exp"))),
    assign("exp", list(op("vector_ref"), reg("prog_tails"), reg("exp"))),
    assign("exp", list(op("vector_ref"), reg("prog_heads"), reg("exp"))),
    go_to(label("make_compound_function"))
);

// 4.1 code
const lookup_name_value = list(
    "lnv_env_loop",
    assign("b", list(op("vector_ref"), reg("the_heads"), reg("b"))), // rest frames
    "lookup_name_value",
    assign("c", list(op("vector_ref"), reg("the_heads"), reg("b"))), // first frame
    assign("d", list(op("vector_ref"), reg("the_tails"), reg("c"))), // values
    assign("c", list(op("vector_ref"), reg("the_heads"), reg("c"))), // names
    "lnv_scan_loop",
    test(op("is_null_ptr"), reg("c")),
    branch("lnv_env_loop"),
    assign("e", list(op("vector_ref"), reg("the_heads"), reg("c"))),
    test(op("==="), reg("a"), reg("e")),
    branch("lnv_return_value"),
    assign("d", list(op("vector_ref"), reg("the_tails"), reg("d"))),
    assign("c", list(op("vector_ref"), reg("the_tails"), reg("c"))),
    go_to(label("lnv_scan_loop")),
    "lnv_return_value",
    assign("res", list(op("vector_ref"), reg("the_heads"), reg("d"))),
    assign("res", list(op("vector_ref"), reg("the_heads"), reg("res"))),
    go_to(reg("continue"))
);

const assign_name_value = list(
    "anv_env_loop",
    assign("b", list(op("vector_ref"), reg("the_heads"), reg("b"))), // rest frames
    "assign_name_value",
    assign("c", list(op("vector_ref"), reg("the_heads"), reg("b"))), // first frame
    assign("d", list(op("vector_ref"), reg("the_tails"), reg("c"))), // values
    assign("c", list(op("vector_ref"), reg("the_heads"), reg("c"))), // names
    "anv_scan_loop",
    test(op("is_null_ptr"), reg("c")),
    branch("anv_env_loop"),
    assign("e", list(op("vector_ref"), reg("the_heads"), reg("c"))),
    test(op("==="), reg("a"), reg("e")),
    branch("anv_set_value"),
    assign("d", list(op("vector_ref"), reg("the_tails"), reg("d"))),
    assign("c", list(op("vector_ref"), reg("the_tails"), reg("c"))),
    go_to(label("anv_scan_loop")),
    "anv_set_value",
    assign("d", list(op("vector_ref"), reg("the_heads"), reg("d"))),
    assign("e", list(op("vector_ref"), reg("the_tails"), reg("d"))),
    test(list(op("==="), reg("e"), constant(false))),
    branch("anv_assign_const"),
    perform(list(op("vector_set"), reg("the_heads"), reg("res"))),
    go_to(reg("continue")),
    "anv_assign_const",
    assign("reg", reg("a")),
    assign("err", constant("no assignment to constants allowed")),
    go_to(label("error"))
);

const make_compound_function = list(
    "make_compound_function",
    save("continue"),
    save("unev"),
    assign("a", list(op("make_prog_ptr"), reg("exp"))),
    save("a"),
    save("env"),
    assign("continue", label("make_compound_function_after_list")),
    assign("a", constant(3)),
    go_to(label("list")),
    "make_compound_function_after_list",
    restore("continue"),
    assign("val", reg("res")),
    go_to(reg("continue"))
);

// HELPERS
function is_equal(a, b) {
    return (is_pair(a) && is_pair(b) &&
            is_equal(head(a), head(b)) && is_equal(tail(a), tail(b)))
           || 
           a === b;
}
        
function assoc(key, records) {
    return is_null(records)
           ? undefined
           : is_equal(key, head(head(records)))
             ? head(records)
             : assoc(key, tail(records));
}

function is_tagged_list(exp, tag) {
    return is_pair(exp) && head(exp) === tag;
}

// MACHINE
function get_contents(register) {
    return register("get");
}

function set_contents(register, value) {
    return register("set")(value);
}

function make_stack() {
    let stack = null;

    function push(x) { 
        stack = pair(x, stack); 
        return "done";
    }

    function pop() {
        if (is_null(stack)) {
            error("Empty stack: POP");

        } else {
            const top = head(stack);
            stack = tail(stack);
            return top;
        }
    }

    function initialize() {
        stack = null;
        return "done";
    }

    function dispatch(message) {
        return message === "push"
            ? push
            : message === "pop"
            ? pop()
            : message === "initialize"
            ? initialize()
            : error("Unknown request: STACK", message);
    }

    return dispatch;
}

function pop(stack) {
    return stack("pop");
}

function push(stack, value) {
    return stack("push")(value);
}

function make_register(name) {
    let contents = "*unassigned*";

    function dispatch(message) {
        if (message === "get") {
            return contents;

        } else {
            if (message === "set") {
                return value => { contents = value; };

            } else {
                error(message, "Unknown request: REGISTER");
            }
        }
    }

    return dispatch;
}

function make_new_machine() {
    const pc = make_register("pc");
    const flag = make_register("flag");
    const stack = make_stack();
    const free = make_register("free");
    const gc_registers = list(
        list("free", free),
        list("scan", make_register("scan")),
        list("old", make_register("old")),
        list("new", make_register("new")),
        list("relocate_continue", make_register("relocate_continue")),
        list("temp", make_register("temp")),
        list("oldhr", make_register("oldhr"))
    );
    const evaluator_registers = list(
        list("exp", make_register("exp")),
        list("env", make_register("env")),
        list("val", make_register("val")),
        list("continue", make_register("continue")),
        list("proc", make_register("proc")),
        list("argl", make_register("argl")),
        list("unev", make_register("unev"))
    );
    const aux_registers = list(
        list("res", make_register("exp")),
        list("head", make_register("head")),
        list("rexpes", make_register("tail")),
    )
    const the_heads = make_register("the_heads");
    const the_tails = make_register("the_tails");
    set_contents(the_heads, make_vector());
    set_contents(the_tails, make_vector());
    const new_heads = make_register("new_heads");
    const new_tails = make_register("new_tails");
    set_contents(new_heads, make_vector());
    set_contents(new_tails, make_vector());
    const prog_heads = make_register("prog_heads");
    const prog_tails = make_register("prog_tails");
    set_contents(prog_heads, make_vector());
    set_contents(prog_tails, make_vector());
    let the_instruction_sequence = null;
    let the_ops = list(list("initialize_stack", () => stack("initialize")));
    the_ops = append(the_ops, vector_ops);
    let register_table = list(list("pc", pc), list("flag", flag),
                              list("the_heads", the_heads), list("the_tails", the_tails),
                              list("new_heads", new_heads), list("new_tails", new_tails),
                              list("prog_heads", prog_heads), list("prog_tails", prog_tails));
    register_table = append(register_table, gc_registers);
    register_table = append(register_table, evaluator_registers);
    register_table = append(register_table, aux_registers);

    function allocate_register(name) {
        if (assoc(name, register_table) === undefined) {
            register_table = pair(list(name, make_register(name)), register_table);
        } else {
            error(name, "Multiply defined register: ");
        }
        return "register_allocated";
    }
    function lookup_register(name) {
        const val = assoc(name, register_table);
        return val === undefined
            ? error(name, "Unknown register:")
            : head(tail(val));
    }
    function execute() {
        const insts = get_contents(pc);
        if (is_null(insts)) {
            return "done";
        } else {
            const proc = instruction_execution_proc(head(insts));
            proc(); 
            return execute();
        }
    }
    function dispatch(message) {
        return message === "start"
                ? () => { set_contents(pc, the_instruction_sequence);
                          set_contents(free, make_ptr_ptr(0));
                          return execute();                          }
            : message === "install_instruction_sequence"
                ? seq => { the_instruction_sequence = seq; }
            : message === "allocate_register"
                ? allocate_register
            : message === "get_register"
                ? lookup_register
            : message === "install_operations"
                ? ops => { the_ops = append(the_ops, ops); }
            : message === "stack"
                ? stack
            : message === "operations"
                ? the_ops
            : message === "install_parsetree"
                ? tree => install_parsetree(prog_heads("get"), prog_tails("get"), tree)
            : error(message, "Unknown request: MACHINE");
    }
    return dispatch;
}

function make_machine(register_names, ops, controller_text) {
    const machine = make_new_machine();

    map(reg_name => machine("allocate_register")(reg_name), register_names);
    machine("install_operations")(ops);
    machine("install_instruction_sequence")(assemble(controller_text, machine));

    return machine;
}

function start(machine) {
    return machine("start")();
}

function get_register_contents(machine, register_name) {
    return get_contents(get_register(machine, register_name));
}

function set_register_contents(machine, register_name, value) {
    set_contents(get_register(machine, register_name), value);
    return "done";
}

function get_register(machine, reg_name) {
    return machine("get_register")(reg_name);
}

// ASSEMBLER

function assemble(controller_text, machine) {
    function receive(insts, labels) {
        update_insts(insts, labels, machine);
        return insts;
    }
    
    return extract_labels(controller_text, receive);
}

function extract_labels(text, receive) {
    function helper(insts, labels) { 
        const next_inst = head(text);

        return is_string(next_inst)
            ? receive(insts, pair(make_label_entry(next_inst, insts), labels))
            : receive(pair(make_instruction(next_inst), insts), labels);
    }

    return text === undefined || is_null(text)
        ? receive(null, null)
        : extract_labels(tail(text), helper);
}

function update_insts(insts, labels, machine) {
    const pc = get_register(machine, "pc");
    const flag = get_register(machine, "flag");
    const stack = machine("stack");
    const ops = machine("operations");

    const set_iep = set_instruction_execution_proc;
    const make_ep = make_execution_function;
    return map(i => set_iep(i,
                            make_ep(instruction_text(i),
                                    labels,
                                    machine,
                                    pc,
                                    flag,
                                    stack,
                                    ops)),
               insts);
}

function make_instruction(text) {
    return pair(text, null);
}

function instruction_text(inst) {
    return head(inst);
}

function instruction_execution_proc(inst) {
    return tail(inst);
}

function set_instruction_execution_proc(inst, proc) {
    set_tail(inst, proc); 
}

function make_label_entry(label_name, insts) {
    return pair(label_name, insts);
}

function lookup_label(labels, label_name) {
    const val = assoc(label_name, labels);

    return val === undefined
        ? error(label_name, "Undefined label: ASSEMBLE")
        : tail(val);
}

function make_execution_function(inst, labels, machine, pc, flag, stack, ops) {
    const x = head(inst);

    return x === "assign"
        ? make_assign(inst, machine, labels, ops, pc)
        : x === "test"
        ? make_test(inst, machine, labels, ops, flag, pc)
        : x === "branch"
        ? make_branch(inst, machine, labels, flag, pc)
        : x === "go_to"
        ? make_goto(inst, machine, labels, pc)
        : x === "save"
        ? make_save(inst, machine, stack, pc)
        : x === "restore"
        ? make_restore(inst, machine, stack, pc)
        : x === "perform"
        ? make_perform(inst, machine, labels, ops, pc)
        : error(inst, "Unknown instruction type: ASSEMBLE");
}

function make_assign(inst, machine, labels, operations, pc) {
    const target = get_register(machine, assign_reg_name(inst));
    const value_exp = assign_value_exp(inst);
    const value_fun = is_operation_exp(value_exp)
          ? make_operation_exp(value_exp, machine, labels, operations)
          : make_primitive_exp(value_exp, machine, labels);

    function perform_make_assign() {
        set_contents(target, value_fun());
        advance_pc(pc); 
    }

    return perform_make_assign;
}

function assign_reg_name(assign_instruction) {
    return head(tail(assign_instruction));
}

function assign_value_exp(assign_instruction) { 
    return head(tail(tail(assign_instruction)));
}

function assign(reg_name, value_exp) {
    return list("assign", reg_name, value_exp);
}

function advance_pc(pc) {
    set_contents(pc, tail(get_contents(pc))); 
    
}

function make_test(inst, machine, labels, operations, flag, pc) {
    const condition = test_condition(inst);

    if (is_operation_exp(condition)) {
        const condition_fun = make_operation_exp(condition, machine, labels, operations);

        function perform_make_test() {
            set_contents(flag, condition_fun());
            advance_pc(pc); 
        }

        return perform_make_test; 
    } else {
        error(inst, "Bad TEST instruction: ASSEMBLE");
    }
}

function test_condition(test_instruction) {
    return head(tail(test_instruction));
}

function test(condition) {
    return list("test", condition);
}

function make_branch(inst, machine, labels, flag, pc) {
    const dest = branch_dest(inst);
    
    if (is_label_exp(dest)) {
        const insts = lookup_label(labels, label_exp_label(dest));

        function perform_make_branch() {
            if (get_contents(flag)) {
                set_contents(pc, insts);

            } else {
                advance_pc(pc);
            }
        }

        return perform_make_branch;

    } else {
        error(inst, "Bad BRANCH instruction: ASSEMBLE");
    }
}

function branch_dest(branch_instruction) {
    return head(tail(branch_instruction));
}

function branch(dest) {
    return list("branch", dest);
}

function make_goto(inst, machine, labels, pc) {
    const dest = goto_dest(inst);

    if (is_label_exp(dest)) {
        const insts = lookup_label(labels, label_exp_label(dest));
        return () => set_contents(pc, insts);

    } else if (is_register_exp(dest)) {
        const reg = get_register(machine, register_exp_reg(dest));
        return () => set_contents(pc, get_contents(reg));

    } else {
        error(inst, "Bad GOTO instruction: ASSEMBLE");
    }
}

function goto_dest(goto_instruction) {
    return head(tail(goto_instruction));
}

function go_to(dest) {
    return list("go_to", dest);
}

function make_save(inst, machine, stack, pc) {
    const reg = get_register(machine, stack_inst_reg_name(inst));

    function perform_make_save() {
        push(stack, get_contents(reg));
        advance_pc(pc);
    }

    return perform_make_save;
}

function make_restore(inst, machine, stack, pc) {
    const reg = get_register(machine, stack_inst_reg_name(inst));

    function perform_make_restore() {
        set_contents(reg, pop(stack));
        advance_pc(pc); 
    }

    return perform_make_restore;
}

function stack_inst_reg_name(stack_instruction) {
    return head(tail(stack_instruction));
}

function save(register_name) {
    return list("save", register_name);
}

function restore(register_name) {
    return list("restore", register_name);
}

function make_perform(inst, machine, labels, operations, pc) {
    const action = perform_action(inst);

    if (is_operation_exp(action)) {
        const action_fun = make_operation_exp(action, machine, labels, operations);
        return () => { action_fun(); advance_pc(pc); };

    } else {
        error(inst, "Bad PERFORM instruction: ASSEMBLE");
    }
}

function perform_action(inst) {
    return head(tail(inst)); 
}

function perform(op) {
    return list("perform", op);
}


function make_primitive_exp(exp, machine, labels) {
    if (is_constant_exp(exp)) {
        const c = constant_exp_value(exp);
        return () => c;
        
    } else if (is_label_exp(exp)) {
        const insts = lookup_label(labels, label_exp_label(exp));
        return () => insts;

    } else if (is_register_exp(exp)) {
        const r = get_register(machine, register_exp_reg(exp));
        return () => get_contents(r); 

    } else {
        error(exp, "Unknown expression type: ASSEMBLE");
    }
}

function is_register_exp(exp) {
    return is_tagged_list(exp, "reg");
}

function register_exp_reg(exp) {
    return head(tail(exp));
}

function reg(name) {
    return list("reg", name);
}

function is_constant_exp(exp) {
    return is_tagged_list(exp, "constant");
}

function constant_exp_value(exp) {
    return head(tail(exp));
}

function constant(value) {
    return list("constant", wrap_ptr(value));
}

function is_label_exp(exp) {
    return is_tagged_list(exp, "label");
}

function label_exp_label(exp) {
    return head(tail(exp));
}

function label(string) {
    return list("label", string);
}

function make_operation_exp(exp, machine, labels, operations) {
    const op = lookup_prim(operation_exp_op(exp), operations);
    const aprocs = map(e => make_primitive_exp(e, machine, labels),
                       operation_exp_operands(exp));

    function perform_make_operation_exp() {
        return op(map(p => p(), aprocs));
    }
    
    return perform_make_operation_exp;
}

function is_operation_exp(exp) {
    return is_tagged_list(head(exp), "op");
}

function operation_exp_op(operation_exp) {
    return head(tail(head(operation_exp)));
}

function operation_exp_operands(operation_exp) {
    return tail(operation_exp);
}

function op(name) {
    return list("op", name);
}

function lookup_prim(symbol, operations) {
    const val = assoc(symbol, operations);

    return val === undefined
        ? error(symbol, "Unknown operation: ASSEMBLE")
        : head(tail(val));
}

function primitive_function(fn) {
    return args => wrap_ptr(apply_in_underlying_javascript(
        fn,
        map(unwrap_ptr, args)
    ));
}

function ptr_aware_function(fn) {
    return args => apply_in_underlying_javascript(fn, args);
}

// 5.3 MEMORY MANAGEMENT

function vector_ref(vector, idx) {
    return vector[unwrap_ptr(idx)];
}

function vector_set(vector, idx, val) {
    vector[unwrap_ptr(idx)] = val;
}

function make_vector() {
    return [];
}

const vector_ops = list(
    list("vector_ref", ptr_aware_function(vector_ref)),
    list("vector_set", ptr_aware_function(vector_set)),
    list("+", primitive_function((a, b) => a + b)),
    list("display", primitive_function(display))
);

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

/*
examples:
parse("1;");
parse("1 + 1;");
parse("1 + 3 * 4;");
parse("(1 + 3) * 4;");
parse("1.4 / 2.3 + 70.4 * 18.3;");
parse("true;");
parse("! (1 === 1);");
parse("(! (1 === 1)) ? 1 : 2;");
parse("'hello' + ' ' + 'world';");
parse("6 * -1;");
parse("-12 - 8;");
parse("function factorial(n) { return n === 1 ? 1 : n * factorial(n - 1);} factorial(4);");
*/
