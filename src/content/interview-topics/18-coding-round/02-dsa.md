# 02 — DSA Question Bank (JavaScript) — 2-year developer level

> Easy English. Grouped by **pattern** — once you know the pattern, most questions solve themselves.
> Only problems that are **realistic at 2 years of experience**. Back to [the coding round guide](README.md).

| § | Pattern | Problems | Level |
|---|---|---|---|
| 1 | Warm-ups | P1–P6 | Easy |
| 2 | Arrays & hashing | P7–P14 | Easy → Medium |
| 3 | Two pointers | P15–P19 | Easy → Medium |
| 4 | Sliding window | P20–P22 | Easy → Medium |
| 5 | Stack | P23–P25 | Easy → Medium |
| 6 | Binary search | P26–P28 | Easy → Medium |
| 7 | Linked list | P29–P32 | Easy → Medium |
| 8 | Trees | P33–P38 | Easy → Medium |
| 9 | Heap & intervals | P39–P41 | Medium |
| 10 | Graphs | P42–P44 | Medium |
| 11 | Dynamic programming | P45–P48 | Easy → Medium |
| 12 | Backtracking | P49–P50 | Medium |

**Every problem:** problem → **idea in simple words** → code → **time / space** → trap or follow-up.

### 🎯 What to do first

| Priority | Problems |
|---|---|
| ✅ **Must do** — asked most at 2 years | P1–P9, P11, P12, P14, P15, P16, P17, P19, P20, P21, P22, P23, P24, P26, P29, P30, P31, P33, P34, P35, P37, P40, P41, P42, P45, P46, P47, P48, P49 |
| 🔸 **Good to know** — if you have time | P10, P13, P18, P25, P27, P28, P32, P36, P38, P39, P43, P44, P50 |

Finish the **Must do** list twice before touching the rest.

### How to talk through any problem
1. Repeat the problem and ask about edge cases (empty input? negatives? duplicates?).
2. Say the **brute force** and its cost first.
3. Say the **pattern** and the better cost.
4. Code it while talking. Then run one example through your code by hand.

---
---

## 1. Warm-ups

> Often the first 10 minutes of a round. Do them fast and clean.

### P1. Reverse a string — Easy
```js
const reverse = (s) => [...s].reverse().join('');     // [...s] handles emoji correctly

// without built-ins — two pointers
function reverseManual(s) {
  const chars = [...s];
  for (let l = 0, r = chars.length - 1; l < r; l++, r--) [chars[l], chars[r]] = [chars[r], chars[l]];
  return chars.join('');
}
```
**Time O(n) · Space O(n)** · More string warm-ups are in [01 — JS Logic](01-js-logic.md).

### P2. Palindrome number (no string conversion) — Easy
**Idea:** build the number backwards digit by digit, then compare.
```js
function isPalindromeNumber(x) {
  if (x < 0) return false;
  let reversed = 0, n = x;
  while (n > 0) {
    reversed = reversed * 10 + (n % 10);
    n = Math.floor(n / 10);
  }
  return reversed === x;
}
```
**Time O(digits) · Space O(1)**

### P3. FizzBuzz — Easy
```js
for (let i = 1; i <= 100; i++) {
  let out = '';
  if (i % 3 === 0) out += 'Fizz';
  if (i % 5 === 0) out += 'Buzz';
  console.log(out || i);
}
```
**Why this version:** adding a new rule (7 → "Bazz") is one line, not another `else if`.

### P4. Second largest number — Easy
**Idea:** one pass, remember the top two.
```js
function secondLargest(nums) {
  let first = -Infinity, second = -Infinity;
  for (const n of nums) {
    if (n > first) { second = first; first = n; }
    else if (n > second && n !== first) second = n;
  }
  return second === -Infinity ? null : second;
}
```
**Time O(n) · Space O(1)** · **Trap:** duplicates — `[5, 5, 3]` → the answer is 3, not 5.

### P5. First non-repeating character — Easy
**Idea:** count every character, then find the first with count 1.
```js
function firstUnique(s) {
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);
  for (let i = 0; i < s.length; i++) if (count.get(s[i]) === 1) return i;
  return -1;
}
```
**Time O(n) · Space O(k)** (k = different characters)

### P6. Remove duplicates from a sorted array, in place — Easy
**Idea:** a "write" pointer. Copy a value only when it differs from the last one written.
```js
function removeDuplicates(nums) {
  if (!nums.length) return 0;
  let k = 1;                                  // nums[0..k-1] are the unique values
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[k - 1]) nums[k++] = nums[i];
  }
  return k;
}
```
**Time O(n) · Space O(1)**

---
---

## 2. Arrays & hashing

> **When:** "have I seen this before?", counting, grouping, finding a pair.
> **The trick:** a `Map` or `Set` turns an O(n) search into O(1) — so O(n²) becomes O(n).

### P7. ⭐ Two Sum — Easy (the most asked question ever)
**Problem:** return the indices of two numbers that add up to `target`.
**Idea:** for each number, ask "have I already seen `target - number`?"
```js
function twoSum(nums, target) {
  const seen = new Map();                      // value → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
```
**Time O(n) · Space O(n)** · Say the brute force first (every pair, O(n²)), then improve.

### P8. Contains duplicate — Easy
```js
const containsDuplicate = (nums) => new Set(nums).size !== nums.length;
```
**Time O(n) · Space O(n)**

### P9. Valid anagram — Easy
```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);
  for (const c of t) {
    if (!count.get(c)) return false;          // missing or already used up
    count.set(c, count.get(c) - 1);
  }
  return true;
}
```
**Time O(n) · Space O(k)** · Sorting both also works — O(n log n).

### P10. Group anagrams — Medium
**Idea:** anagrams become the **same string when sorted**. Use that as the Map key.
```js
function groupAnagrams(words) {
  const groups = new Map();
  for (const w of words) {
    const key = [...w].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}

groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat']);   // [['eat','tea','ate'], ['tan','nat']]
```
**Time O(n · k log k)** (k = word length)

### P11. ⭐ Top K frequent elements — Medium
**Idea:** count with a Map. Then **bucket sort**: bucket[i] = numbers that appear i times. Read from the top.
```js
function topKFrequent(nums, k) {
  const count = new Map();
  for (const n of nums) count.set(n, (count.get(n) || 0) + 1);

  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [n, c] of count) buckets[c].push(n);

  const res = [];
  for (let c = buckets.length - 1; c >= 0 && res.length < k; c--) res.push(...buckets[c]);
  return res.slice(0, k);
}
```
**Time O(n) · Space O(n)** · Simpler to explain: sort the counts — O(n log n).

### P12. Product of array except self (no division) — Medium
**Idea:** answer[i] = (product of everything **left** of i) × (product of everything **right** of i).
```js
function productExceptSelf(nums) {
  const n = nums.length, res = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { res[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { res[i] *= suffix; suffix *= nums[i]; }
  return res;
}
```
**Time O(n) · Space O(1)** extra

### P13. Longest consecutive sequence — Medium
**Problem:** `[100, 4, 200, 1, 3, 2]` → 4 (the run 1, 2, 3, 4).
**Idea:** put everything in a Set. Only start counting from a number whose `n - 1` is missing.
```js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;             // not the start of a run
    let len = 1;
    while (set.has(n + len)) len++;
    best = Math.max(best, len);
  }
  return best;
}
```
**Time O(n) · Space O(n)**

### P14. ⭐ Subarray sum equals K — Medium
**Problem:** how many continuous subarrays add up to `k`? (Numbers can be negative.)
**Idea:** **prefix sums** — if the running sum is `S` now and was `S - k` earlier, the part between adds up to `k`.
```js
function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]);             // a running sum of 0 exists before we start
  let sum = 0, count = 0;
  for (const x of nums) {
    sum += x;
    count += seen.get(sum - k) || 0;
    seen.set(sum, (seen.get(sum) || 0) + 1);
  }
  return count;
}
```
**Time O(n) · Space O(n)** · **Trap:** sliding window does **not** work here because of negative numbers.

---
---

## 3. Two pointers

> **When:** a **sorted** array, pairs, palindromes, or rearranging in place.
> **The trick:** one pointer at each end (or a slow and a fast one), moving toward each other.

### P15. Valid palindrome (ignore non-letters) — Easy
```js
function isPalindrome(s) {
  const ok = (c) => /[a-z0-9]/i.test(c);
  let l = 0, r = s.length - 1;
  while (l < r) {
    if (!ok(s[l])) { l++; continue; }
    if (!ok(s[r])) { r--; continue; }
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    l++; r--;
  }
  return true;
}

isPalindrome('A man, a plan, a canal: Panama');   // true
```
**Time O(n) · Space O(1)**

### P16. Two Sum II — sorted input — Easy
**Idea:** sum too small → move left pointer right. Too big → move right pointer left.
```js
function twoSumSorted(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l < r) {
    const sum = nums[l] + nums[r];
    if (sum === target) return [l, r];
    if (sum < target) l++;
    else r--;
  }
  return [];
}
```
**Time O(n) · Space O(1)**

### P17. ⭐ 3Sum — Medium
**Problem:** all **unique** triplets that add up to 0.
**Idea:** sort. Fix one number, then do Two Sum II on the rest. Skip duplicates.
```js
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;          // skip duplicate first numbers
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        res.push([nums[i], nums[l], nums[r]]);
        l++; r--;
        while (l < r && nums[l] === nums[l - 1]) l++;        // skip duplicates
        while (l < r && nums[r] === nums[r + 1]) r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return res;
}
```
**Time O(n²) · Space O(1)** extra · **Trap:** forgetting to skip duplicates.

### P18. Container with most water — Medium
**Idea:** the water is limited by the **shorter** wall. Always move the shorter one.
```js
function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++;
    else r--;
  }
  return best;
}
```
**Time O(n) · Space O(1)**

### P19. Move zeroes to the end (keep order) — Easy
```js
function moveZeroes(nums) {
  let insert = 0;                                  // next place for a non-zero
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      [nums[insert], nums[i]] = [nums[i], nums[insert]];
      insert++;
    }
  }
  return nums;
}
```
**Time O(n) · Space O(1)**

---
---

## 4. Sliding window

> **When:** "longest / shortest / best **continuous** subarray or substring".
> **The trick:** a window `[left, right]`. Grow `right`. When the window breaks a rule, shrink `left`.

### P20. Best time to buy and sell stock — Easy
**Idea:** remember the lowest price so far; the best profit is today minus that low.
```js
function maxProfit(prices) {
  let minPrice = Infinity, best = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    best = Math.max(best, p - minPrice);
  }
  return best;
}
```
**Time O(n) · Space O(1)**

### P21. Maximum sum of a subarray of size k (fixed window) — Easy
**Idea:** slide the window by one: add the new element, subtract the one that left.
```js
function maxSumWindow(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let i = k; i < nums.length; i++) {
    sum += nums[i] - nums[i - k];
    best = Math.max(best, sum);
  }
  return best;
}
```
**Time O(n) · Space O(1)** · The template for every window question.

### P22. ⭐ Longest substring without repeating characters — Medium
**Idea:** grow the window; when a character repeats **inside** the window, jump `left` past its last position.
```js
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (lastSeen.has(c) && lastSeen.get(c) >= left) left = lastSeen.get(c) + 1;
    lastSeen.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

lengthOfLongestSubstring('abcabcbb');   // 3 ('abc')
```
**Time O(n) · Space O(k)** · **Trap:** the `>= left` check — ignore old positions outside the window.

---
---

## 5. Stack

> **When:** matching pairs, "undo", or "the **next greater** element".

### P23. ⭐ Valid parentheses — Easy
```js
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;       // wrong or missing opener
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;                             // nothing left open
}
```
**Time O(n) · Space O(n)**

### P24. Min stack (getMin in O(1)) — Medium
**Idea:** store each value **together with the minimum at that moment**.
```js
class MinStack {
  constructor() { this.stack = []; }
  push(x) {
    const min = this.stack.length ? Math.min(x, this.getMin()) : x;
    this.stack.push([x, min]);
  }
  pop()    { this.stack.pop(); }
  top()    { return this.stack[this.stack.length - 1][0]; }
  getMin() { return this.stack[this.stack.length - 1][1]; }
}
```
**All operations O(1)**

### P25. Daily temperatures (next warmer day) — Medium
**Idea:** a stack of days still **waiting** for a warmer day. A warmer day pops and answers them.
```js
function dailyTemperatures(temps) {
  const res = new Array(temps.length).fill(0);
  const stack = [];                                       // indexes, temperatures decreasing
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const j = stack.pop();
      res[j] = i - j;
    }
    stack.push(i);
  }
  return res;
}
```
**Time O(n) · Space O(n)**

---
---

## 6. Binary search

> **When:** sorted data, or "find the **smallest value that works**".

### P26. ⭐ Binary search — Easy (write it bug-free)
```js
function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;               // integer middle
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```
**Time O(log n) · Space O(1)** · **Traps:** `<=` (not `<`), and `mid ± 1` — or it loops forever.

### P27. Search in a rotated sorted array — Medium
**Problem:** `[4,5,6,7,0,1,2]` — a sorted array rotated at an unknown point.
**Idea:** at any `mid`, **one half is still sorted**. Check if the target is inside that half.
```js
function searchRotated(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {                          // left half is sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {                                              // right half is sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
```
**Time O(log n) · Space O(1)**

### P28. Koko eating bananas — binary search on the answer — Medium
**Problem:** the smallest eating speed that finishes all piles within `h` hours.
**Idea:** if a speed works, every faster speed works — so binary search the **speed**.
```js
function minEatingSpeed(piles, h) {
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const hours = piles.reduce((sum, p) => sum + Math.ceil(p / mid), 0);
    if (hours <= h) hi = mid;            // works — try slower
    else lo = mid + 1;                   // too slow — go faster
  }
  return lo;
}
```
**Time O(n log m)** · The same pattern solves "minimum capacity", "minimum servers", "smallest rate limit".
---
---

## 7. Linked list

> **Tricks:** a **dummy** head node (removes edge cases), and **slow/fast** pointers.

```js
class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}
```

### P29. ⭐ Reverse a linked list — Easy (asked constantly)
**Idea:** walk the list and turn each arrow around. Keep previous, current, next.
```js
function reverseList(head) {
  let prev = null, cur = head;
  while (cur) {
    const next = cur.next;      // remember the rest
    cur.next = prev;            // turn the arrow around
    prev = cur;
    cur = next;
  }
  return prev;                  // the old tail is the new head
}
```
**Time O(n) · Space O(1)**

### P30. Merge two sorted lists — Easy
```js
function mergeTwoLists(a, b) {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a || b;            // attach whatever is left
  return dummy.next;
}
```
**Time O(n + m) · Space O(1)**

### P31. ⭐ Detect a cycle (Floyd) — Easy
**Idea:** slow pointer (1 step) and fast pointer (2 steps). If there is a loop, fast catches slow —
like a faster runner lapping a slower one on a track.
```js
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```
**Time O(n) · Space O(1)**

### P32. Remove the Nth node from the end — Medium
**Idea:** move `fast` n+1 steps ahead, then move both until `fast` falls off the end.
```js
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);          // ⭐ handles removing the head itself
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;
  while (fast) { fast = fast.next; slow = slow.next; }
  slow.next = slow.next.next;
  return dummy.next;
}
```
**Time O(n) · Space O(1)**

---
---

## 8. Trees

> **DFS (recursion)** → depth, paths, checking rules. **BFS (queue)** → level by level.
> **Recursion template:** handle `null` first, trust the recursive call for the children, combine.

```js
class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
```

### P33. Maximum depth — Easy
```js
const maxDepth = (node) => (node ? 1 + Math.max(maxDepth(node.left), maxDepth(node.right)) : 0);
```
**Time O(n) · Space O(h)** (h = tree height)

### P34. Invert a binary tree — Easy
```js
function invertTree(node) {
  if (!node) return null;
  [node.left, node.right] = [invertTree(node.right), invertTree(node.left)];
  return node;
}
```
**Time O(n) · Space O(h)**

### P35. ⭐ Level-order traversal (BFS) — Medium
```js
function levelOrder(root) {
  if (!root) return [];
  const res = [];
  let level = [root];
  while (level.length) {
    res.push(level.map((n) => n.val));
    const next = [];
    for (const node of level) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    level = next;
  }
  return res;
}
```
**Time O(n) · Space O(w)** · Variations (right-side view, average per level) use the same template.

### P36. Diameter of a binary tree — Easy/Medium
**Idea:** the longest path through a node = left depth + right depth. Track the best while computing depths.
```js
function diameterOfBinaryTree(root) {
  let best = 0;
  const depth = (node) => {
    if (!node) return 0;
    const l = depth(node.left), r = depth(node.right);
    best = Math.max(best, l + r);
    return 1 + Math.max(l, r);
  };
  depth(root);
  return best;
}
```
**Time O(n) · Space O(h)**

### P37. ⭐ Validate a binary search tree — Medium
**Idea:** every node must sit inside a **range** set by its ancestors — not just compared to its parent.
```js
function isValidBST(node, min = -Infinity, max = Infinity) {
  if (!node) return true;
  if (node.val <= min || node.val >= max) return false;
  return isValidBST(node.left, min, node.val) && isValidBST(node.right, node.val, max);
}
```
**Time O(n) · Space O(h)** · **Trap:** checking only `left < node < right` misses a small value deep on the right.

### P38. Lowest common ancestor in a BST — Medium
**Idea:** both smaller → go left. Both bigger → go right. Otherwise, you are at the split point.
```js
function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p.val < node.val && q.val < node.val) node = node.left;
    else if (p.val > node.val && q.val > node.val) node = node.right;
    else return node;
  }
  return null;
}
```
**Time O(h) · Space O(1)**

---
---

## 9. Heap & intervals

> JavaScript has **no built-in heap** — explain the sort version first, then write the small heap if asked.
> **Intervals** → sort by start, then walk once. ⭐ This is **your booking domain** — say so.

### A small MinHeap
```js
class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                  // bubble up
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {                                 // sink down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
```

### P39. Kth largest element — Medium
**Simple:** `[...nums].sort((a, b) => b - a)[k - 1]` — O(n log n). Say this first.
**Better:** keep a min-heap of size k; its smallest is the k-th largest overall.
```js
function findKthLargest(nums, k) {
  const heap = new MinHeap();
  for (const n of nums) {
    heap.push(n);
    if (heap.size() > k) heap.pop();        // drop the smallest
  }
  return heap.peek();
}
```
**Time O(n log k) · Space O(k)**

### P40. ⭐ Merge overlapping intervals — Medium
**Idea:** sort by start. If the next interval starts before the current one ends, stretch the current one.
```js
function mergeIntervals(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const res = [];
  for (const [start, end] of intervals) {
    const last = res[res.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);   // overlap → merge
    else res.push([start, end]);
  }
  return res;
}

mergeIntervals([[1, 3], [2, 6], [8, 10]]);   // [[1, 6], [8, 10]]
```
**Time O(n log n) · Space O(n)** · **Your domain:** merging a doctor's busy blocks to find free time.

### P41. ⭐ Meeting rooms — minimum rooms needed — Medium
**Problem:** given appointment times, how many rooms (or doctors) are needed so none overlap?
**Idea:** sort starts and ends separately. A meeting that starts before the earliest end needs a new
room; otherwise it reuses the room that just freed up.
```js
function minMeetingRooms(intervals) {
  const starts = intervals.map((i) => i[0]).sort((a, b) => a - b);
  const ends = intervals.map((i) => i[1]).sort((a, b) => a - b);
  let rooms = 0, e = 0;
  for (let s = 0; s < starts.length; s++) {
    if (starts[s] < ends[e]) rooms++;        // nobody has left yet — need another room
    else e++;                                // a room freed up — reuse it
  }
  return rooms;
}

minMeetingRooms([[0, 30], [5, 10], [15, 20]]);   // 2
```
**Time O(n log n) · Space O(n)** · ⭐ "This is the scheduling problem behind clinic bookings."

---
---

## 10. Graphs

> A grid is a graph: each cell connects to its 4 neighbours.
> **DFS** → explore everything connected. **BFS** → fewest steps. **Topological sort** → task order.

### P42. ⭐ Number of islands — Medium
**Idea:** scan the grid. On land, count one island and "sink" all land connected to it.
```js
function numIslands(grid) {
  const rows = grid.length, cols = grid[0].length;
  let count = 0;
  const sink = (r, c) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';                                   // mark as visited
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') { count++; sink(r, c); }
    }
  }
  return count;
}
```
**Time O(rows × cols)** · **Trap:** it modifies the input — copy it if that is not allowed.

### P43. Course schedule — can all tasks finish? — Medium
**Idea (topological sort):** start with tasks that need nothing. Finishing one reduces the "waiting
count" of the tasks after it. If everything gets done, there is no circular dependency.
```js
function canFinish(n, prerequisites) {
  const indegree = new Array(n).fill(0);
  const graph = Array.from({ length: n }, () => []);
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
    indegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);

  let done = 0;
  for (let head = 0; head < queue.length; head++) {
    done++;
    for (const next of graph[queue[head]]) {
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  return done === n;
}
```
**Time O(V + E)** · **Real use:** build order, migration order, job pipelines.

### P44. Rotting oranges — BFS from many starts — Medium
**Idea:** start BFS from **all** rotten oranges at once; each BFS level is one minute.
```js
function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  let queue = [], fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      else if (grid[r][c] === 1) fresh++;
    }
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let minutes = 0;
  while (queue.length && fresh > 0) {
    const next = [];
    for (const [r, c] of queue) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2;
          fresh--;
          next.push([nr, nc]);
        }
      }
    }
    queue = next;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}
```
**Time O(rows × cols)**

---
---

## 11. Dynamic programming

> **When:** "count the ways", "minimum cost", "maximum value", and the same small problem repeats.
> **Recipe:** (1) define `dp[i]` in words, (2) how `dp[i]` uses smaller answers, (3) base case, (4) fill in order.

### P45. ⭐ Climbing stairs — Easy (the DP starter)
**Problem:** 1 or 2 steps at a time. How many ways to reach step n?
**Idea:** you arrive from n-1 or n-2 → `ways(n) = ways(n-1) + ways(n-2)`.
```js
function climbStairs(n) {
  let a = 1, b = 1;                  // ways to reach step 0 and step 1
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```
**Time O(n) · Space O(1)** · **Say:** "Plain recursion is O(2ⁿ) because it repeats work."

### P46. House robber — Medium
**Problem:** max money from houses in a row, without robbing two neighbours.
**Idea:** at each house: rob it (+ best from two back) or skip it (best from one back).
```js
function rob(nums) {
  let prev = 0, curr = 0;
  for (const x of nums) [prev, curr] = [curr, Math.max(curr, prev + x)];
  return curr;
}
```
**Time O(n) · Space O(1)**

### P47. ⭐ Maximum subarray sum (Kadane) — Medium
**Idea:** at each number, either **start fresh** or **extend** the previous run — whichever is bigger.
```js
function maxSubArray(nums) {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}
```
**Time O(n) · Space O(1)** · **Trap:** starting `best` at 0 is wrong when all numbers are negative.

### P48. ⭐ Coin change — fewest coins — Medium
**Idea:** `dp[a]` = fewest coins to make amount `a`; for each coin, `dp[a] = dp[a - coin] + 1`.
```js
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```
**Time O(amount × coins)** · **Trap:** greedy fails — coins `[1, 3, 4]`, amount 6 → greedy 4+1+1, best 3+3.

---
---

## 12. Backtracking

> **When:** "all combinations / subsets / permutations". **Template:** choose → explore → **un-choose**.

### P49. ⭐ Subsets — Medium
```js
function subsets(nums) {
  const res = [], path = [];
  const backtrack = (start) => {
    res.push([...path]);                    // every path is a valid subset
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);                   // choose
      backtrack(i + 1);                     // explore
      path.pop();                           // un-choose
    }
  };
  backtrack(0);
  return res;
}
```
**Time O(n · 2ⁿ)** · **Trap:** push a **copy** (`[...path]`), not `path` itself.

### P50. Permutations — Medium
```js
function permute(nums) {
  const res = [], path = [], used = new Array(nums.length).fill(false);
  const backtrack = () => {
    if (path.length === nums.length) return res.push([...path]);
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; path.push(nums[i]);
      backtrack();
      path.pop(); used[i] = false;
    }
  };
  backtrack();
  return res;
}
```
**Time O(n · n!)**

---

## Self-check

- [ ] Say the pattern for 10 random problems before looking at the solution
- [ ] Two Sum, Valid Parentheses and Reverse Linked List in under 5 minutes each
- [ ] The sliding-window template (P21), adapted to P22
- [ ] Binary search with no off-by-one bug
- [ ] BFS level order and number of islands
- [ ] Explain the DP recipe using coin change
- [ ] The backtracking template from memory
- [ ] Meeting rooms (P41), connected to clinic bookings out loud
