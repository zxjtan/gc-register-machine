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
    const the_heads = make_register("the_heads");
    const the_tails = make_register("the_tails");
    set_contents(the_heads, make_vector());
    set_contents(the_tails, make_vector());
    const new_heads = make_register("new_heads");
    const new_tails = make_register("new_tails");
    set_contents(new_heads, make_vector());
    set_contents(new_tails, make_vector());
    let the_instruction_sequence = null;
    let the_ops = list(list("initialize_stack", () => stack("initialize")));
    the_ops = append(the_ops, vector_ops);
    let register_table = list(list("pc", pc), list("flag", flag),
                              list("the_heads", the_heads), list("the_tails", the_tails),
                              list("new_heads", new_heads), list("new_tails", new_tails));
    register_table = append(register_table, gc_registers);
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
                          set_contents(free, 0);
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
    return list("constant", value);
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
    return args => apply_in_underlying_javascript(fn, args);
}

// 5.3 MEMORY MANAGEMENT

function vector_ref(vector, ptr) {
    if (is_ptr(ptr)) {
        const n = ptr_address(ptr);
        return vector[n];
    } else {
        return vector[ptr];
    }
}

function vector_set(vector, ptr, val) {
    if (is_ptr(ptr)) {
        const n = ptr_address(ptr);
        vector[n] = val;
    } else {
        vector[ptr] = val;
    }
}

function make_vector() {
    return [];
}

function make_ptr(n) {
    return pair("ptr", n);
}

function make_null_ptr() {
    return pair("ptr", null);
}

function is_ptr(ptr) {
    return is_tagged_list(ptr, "ptr");
}

function is_null_ptr(ptr) {
    return is_ptr(ptr) === is_null(ptr_address(ptr));
}

function ptr_address(ptr) {
    return tail(ptr);
}

const vector_ops = list(
    list("vector_ref", primitive_function(vector_ref)),
    list("vector_set", primitive_function(vector_set)),
    list("+", primitive_function((a, b) => a + b)),
    list("display", primitive_function(display))
);

const gc_ops = list(
    list("is_broken_heart", primitive_function(str => is_equal(str, "broken_heart"))),
    list("===", primitive_function(is_equal)),
    list("is_pointer_to_pair", primitive_function(is_ptr))
);
