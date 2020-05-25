class Point {
    constructor(x, y) {
        Object.assign(this, {x, y});
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

export class Circle {
    constructor(x, y, radius) {
        const center = new Point(x, y);
        Object.assign(this, {center, radius});
    }

    area() {
        return Math.PI * this.radius * this.radius;
    }

    toString() {
        return `${this.center} r${this.radius}`;
    }
}
