import {foo} from "./foo.js";

const barMsg = "bar";
const bar = () => barMsg;

export const foobar = () => {
    return foo() + bar();
};
