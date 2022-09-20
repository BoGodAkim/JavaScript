var SummaryRanges = function () {
    this.Interval = [];
};

/**
 * @param {number} val
 * @return {void}
 */


SummaryRanges.prototype.addNum = function (val) {
    let index = 0;
    for (let i = 0; i < this.Interval.length; i++) {
        if (this.Interval[i][0] <= val && this.Interval[i][1] >= val) {
            return;
        }
        if (this.Interval[i][1] + 1 === val) {
            this.Interval[i][1] = val;
            while (i + 1 < this.Interval.length && this.Interval[i][1] + 1 === this.Interval[i + 1][0]) {
                this.Interval[i][1] = this.Interval[i + 1][1];
                this.Interval.splice(i + 1, 1);
            }
            console.log(this.Interval);
            return;
        }
        if (this.Interval[i][0] - 1 === val) {
            this.Interval[i][0] = val;
            while (i - 1 > 0 && this.Interval[i][0] - 1 === this.Interval[i - 1][1]) {
                this.Interval[i][0] = this.Interval[i - 1][0];
                this.Interval.splice(i - 1, 1);
            }
            console.log(this.Interval);
            return;
        }
        if (this.Interval[i][1] < val) {
            index = i + 1;
        }
    }
    this.Interval.splice(index, 0, [val, val]);
    console.log(this.Interval);
    return;
};

/**
 * @return {number[][]}
 */
SummaryRanges.prototype.getIntervals = function () {
    return this.Interval;
};

let summaryRanges = new SummaryRanges();
summaryRanges.addNum(1);      // arr = [1]
summaryRanges.getIntervals(); // return [[1, 1]]
summaryRanges.addNum(3);      // arr = [1, 3]
summaryRanges.getIntervals(); // return [[1, 1], [3, 3]]
summaryRanges.addNum(7);      // arr = [1, 3, 7]
summaryRanges.getIntervals(); // return [[1, 1], [3, 3], [7, 7]]
summaryRanges.addNum(2);      // arr = [1, 2, 3, 7]
summaryRanges.getIntervals(); // return [[1, 3], [7, 7]]
summaryRanges.addNum(6);      // arr = [1, 2, 3, 6, 7]
summaryRanges.getIntervals(); // return [[1, 3], [6, 7]]

let summaryRanges2 = new SummaryRanges();
summaryRanges2.addNum(1);      // arr = [1]
console.log(summaryRanges2.getIntervals()); // return [[1, 1]]

/**
 * Your SummaryRanges object will be instantiated and called as such:
 * var obj = new SummaryRanges()
 * obj.addNum(val)
 * var param_2 = obj.getIntervals()
 */