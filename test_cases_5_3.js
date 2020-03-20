function test_machine() {
    return make_machine(list("a", "b", "t"),
                        list(list("print", primitive_function(display))),
                        list("test-b",
                             perform(list(op("vector_set"), reg("the_heads"), reg("free"), constant(1))),
                             perform(list(op("vector_set"), reg("the_tails"), reg("free"), constant(2))),
                             assign("a", reg("free")),
                             assign("free", list(op("inc_ptr"), reg("free"))),
                             perform(list(op("vector_set"), reg("the_heads"), reg("free"), constant(5))),
                             perform(list(op("vector_set"), reg("the_tails"), reg("free"), reg("a"))),
                             assign("b", reg("free")),
                             assign("free", list(op("inc_ptr"), reg("free"))),
                             perform(list(op("vector_set"), reg("the_tails"), reg("a"), reg("b"))),
                             perform(list(op("display"), reg("a"))),
                             perform(list(op("display"), reg("b"))),
                             assign("t", list(op("vector_ref"), reg("the_tails"), reg("a"))),
                             perform(list(op("display"), reg("t"))),
                             assign("a", list(op("vector_ref"), reg("the_heads"), reg("t"))),
                             perform(list(op("display"), reg("a")))));
}

const mach = test_machine();
start(mach);