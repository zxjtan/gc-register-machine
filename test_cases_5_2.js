function gcd_machine() {
    return make_machine(list("a", "b", "t"),
                        list(list("rem", primitive_function((a, b) => a % b)),
                             list("=", primitive_function((a, b) => a === b)),
                             list("print", primitive_function(display))),
                        list("test-b",
                             test(list(op("="), reg("b"), constant(0))),
                             branch(label("gcd-done")),
                             assign("t", list(op("rem"), reg("a"), reg("b"))),
                             assign("a", reg("b")),
                             assign("b", reg("t")),
                             go_to(label("test-b")),
                             "gcd-done",
                             perform(list(op("print"), reg("a")))));
}

const gcd = gcd_machine();
set_register_contents(gcd, "a", 100);
set_register_contents(gcd, "b", 90);
start(gcd);

function fib_machine() {
    return make_machine(list("continue", "n", "val"),
                        list(list("<", primitive_function((a, b) => a < b)),
                             list("-", primitive_function((a, b) => a - b)),
                             list("+", primitive_function((a, b) => a + b)),
                             list("print", primitive_function(display))),
                        list(      
                            assign("continue", label("fib-done")),
                            "fib-loop",
                            test(list(op("<"), reg("n"), constant(2))),
                            branch(label("immediate-answer")),
                            // set up to compute Fib(n-1)
                            save("continue"),
                            assign("continue", label("afterfib-n-1")),
                            save("n"),                  // save old value of n
                                                   // clobber n to n - 1       
                            assign("n", list(op("-"), reg("n"), constant(1))), 
                            go_to(label("fib-loop")),   // perform recursive call
                            "afterfib-n-1",                                
                                               // upon return, "val" contains Fib(n-1)
                            restore("n"),
                            restore("continue"),        // set up to compute Fib(n-2)
                            assign("n", list(op("-"), reg("n"), constant(2))),
                            save("continue"),
                            assign("continue", label("afterfib-n-2")),
                            save("val"),                // save Fib(n-1)
                            go_to(label("fib-loop")),
                            "afterfib-n-2",             // upon return, "val" contains Fib(n-2)
                            assign("n", reg("val")),    // "n" now contains Fib(n-2)
                            restore("val"),             // "val" now contains Fib(n-1)
                            restore("continue"),
                            assign("val",               // Fib(n-1) + Fib(n-2)
                            list(op("+"), reg("val"), reg("n"))),
                            go_to(reg("continue")),     // return to caller, answer is in "val"
                            "immediate-answer",
                            assign("val", reg("n")),    // base case: Fib(n) = n
                            go_to(reg("continue")),
                            "fib-done",
                            perform(list(op("print"), reg("val")))));
}

const fib = fib_machine();
set_register_contents(fib, "n", 10);
start(fib);
