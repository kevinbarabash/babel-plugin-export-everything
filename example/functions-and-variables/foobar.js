import {foo} from "./foo.js";

const msg = "bar";
const bar = () => msg;

export const foobar = () => {
    return foo() + bar();
};
