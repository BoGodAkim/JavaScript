/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
var findMedianSortedArrays = function (nums1, nums2) {
    let median = 0;
    let medianIndex = (nums1.length + nums2.length - 1) / 2;
    let merged = [];
    if (medianIndex === 0) {
        if (nums1.length > 0) {
            median = nums1[0];
        }
        else if (nums2.length > 0) {
            median = nums2[0];
        }
        return median;
    }
    while (nums1.length > 0 && nums2.length > 0) {
        if (nums1[0] < nums2[0]) {
            merged.push(nums1.shift());
        } else {
            merged.push(nums2.shift());
        }
        if (merged.length - 1 > medianIndex) {
            if (medianIndex % 1 === 0) {
                median = merged[medianIndex];
            } else {
                median = (merged[Math.floor(medianIndex)] + merged[Math.floor(medianIndex) + 1]) / 2;
            }
            return median;
        }
    }
    while (nums1.length > 0) {
        merged.push(nums1.shift());
        if (merged.length - 1 > medianIndex) {
            if (medianIndex % 1 === 0) {
                median = merged[medianIndex];
            } else {
                median = (merged[Math.floor(medianIndex)] + merged[Math.floor(medianIndex) + 1]) / 2;
            }
            return median;
        }
    }
    while (nums2.length > 0) {
        merged.push(nums2.shift());
        if (merged.length - 1 > medianIndex) {
            if (medianIndex % 1 === 0) {
                median = merged[medianIndex];
            } else {
                median = (merged[Math.floor(medianIndex)] + merged[Math.floor(medianIndex) + 1]) / 2;
            }
            return median;
        }
    }
};

console.log(findMedianSortedArrays([1, 3], []));