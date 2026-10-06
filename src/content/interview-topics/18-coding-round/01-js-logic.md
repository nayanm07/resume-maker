# 01 — JavaScript Logic Questions (with and without built-in functions)

> Easy English. These are the **first questions in most coding rounds**.
> Every question is solved **two ways**, because interviewers almost always say:
> *"Good. Now do it **without** using built-in functions."*
> Back to [the coding round guide](README.md).

### The rules for "without built-ins"

| ✅ Allowed | ❌ Not allowed |
|---|---|
| `for` / `while` loops, `if`, indexes `s[i]`, `.length`, `push` | `split`, `reverse`, `join`, `sort`, `map`, `filter`, `reduce`, `includes`, `indexOf`, `Set`, `Math.max`, `toUpperCase`… |

If you are not sure what is allowed — **ask**. That question itself looks good.

### How to answer
1. Say the **idea** in one line.
2. Write the **built-in** version first (fast, shows you know the language).
3. Write the **manual** version (shows you understand the logic).
4. Say the **time complexity**.

| Section | Questions |
|---|---|
| **A. Strings** | Q1–Q16 |
| **B. Numbers** | Q17–Q27 |
| **C. Arrays** | Q28–Q47 |
| **D. Objects & arrays of objects** | Q48–Q55 |

---
---

# A. STRINGS

---

### Q1. Reverse a string — Easy
`"hello"` → `"olleh"`

**With built-ins**
```js
const reverse = (s) => s.split('').reverse().join('');
```
**Without built-ins**
```js
function reverse(s) {
  let out = '';
  for (let i = s.length - 1; i >= 0; i--) out += s[i];   // walk from the end
  return out;
}
```
**Time O(n).** Tip: `[...s].reverse().join('')` also handles emoji correctly.

### Q2. Check if a string is a palindrome — Easy
`"madam"` → `true`, `"hello"` → `false`

**With built-ins**
```js
const isPalindrome = (s) => s === s.split('').reverse().join('');
```
**Without built-ins** — compare from both ends, stop early
```js
function isPalindrome(s) {
  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}
```
**Time O(n).** The manual version is **better** — it stops at the first mismatch and uses no extra memory.
**Follow-up:** ignore case and spaces → clean the string first: `s.toLowerCase().replace(/[^a-z0-9]/g, '')`.

### Q3. Count the vowels — Easy
`"javascript"` → `3`

**With built-ins**
```js
const countVowels = (s) => (s.match(/[aeiou]/gi) || []).length;
```
**Without built-ins**
```js
function countVowels(s) {
  const vowels = 'aeiouAEIOU';
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = 0; j < vowels.length; j++) {
      if (s[i] === vowels[j]) { count++; break; }
    }
  }
  return count;
}
```
**Trap:** `match` returns `null` when nothing is found — hence the `|| []`.

### Q4. Count how many times each character appears — Easy (very common)
`"hello"` → `{ h: 1, e: 1, l: 2, o: 1 }`

**With built-ins**
```js
const charCount = (s) =>
  s.split('').reduce((acc, ch) => {
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {});
```
**Without built-ins**
```js
function charCount(s) {
  const count = {};
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (count[ch]) count[ch]++;
    else count[ch] = 1;
  }
  return count;
}
```
**Time O(n).** ⭐ This "count with an object" idea solves Q5, Q6, Q10, Q32 and Q46 too.

### Q5. Most frequent character — Easy
`"javascript"` → `"a"`

**With built-ins**
```js
function mostFrequent(s) {
  const count = charCount(s);
  return Object.keys(count).reduce((a, b) => (count[a] >= count[b] ? a : b));
}
```
**Without built-ins**
```js
function mostFrequent(s) {
  const count = {};
  let best = '', bestCount = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    count[ch] = (count[ch] || 0) + 1;
    if (count[ch] > bestCount) { best = ch; bestCount = count[ch]; }   // track while counting
  }
  return best;
}
```
**Time O(n)** — the manual version does it in **one** pass.

### Q6. First non-repeating character — Easy
`"aabbcdd"` → `"c"`

**With built-ins**
```js
const firstUnique = (s) => s.split('').find((ch) => s.indexOf(ch) === s.lastIndexOf(ch)) ?? null;
```
**Without built-ins** — count first, then find the first with count 1
```js
function firstUnique(s) {
  const count = {};
  for (let i = 0; i < s.length; i++) count[s[i]] = (count[s[i]] || 0) + 1;
  for (let i = 0; i < s.length; i++) {
    if (count[s[i]] === 1) return s[i];
  }
  return null;
}
```
**Time:** the built-in version is **O(n²)** (`indexOf` scans each time); the manual one is **O(n)**. Say that —
it shows that shorter code is not always faster code.

### Q7. Capitalise the first letter of each word — Easy
`"hello world from js"` → `"Hello World From Js"`

**With built-ins**
```js
const titleCase = (s) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
```
**Without built-ins** — use character codes: `'a'` is 97, `'A'` is 65 (a difference of 32)
```js
function titleCase(s) {
  let out = '';
  let startOfWord = true;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = ch.charCodeAt(0);
    if (startOfWord && code >= 97 && code <= 122) out += String.fromCharCode(code - 32);   // a-z → A-Z
    else out += ch;
    startOfWord = ch === ' ';
  }
  return out;
}
```

### Q8. Reverse the order of words — Easy
`"I love JavaScript"` → `"JavaScript love I"`

**With built-ins**
```js
const reverseWords = (s) => s.trim().split(/\s+/).reverse().join(' ');
```
**Without built-ins** — collect words manually, then build backwards
```js
function reverseWords(s) {
  const words = [];
  let word = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') {
      if (word) { words.push(word); word = ''; }
    } else {
      word += s[i];
    }
  }
  if (word) words.push(word);

  let out = '';
  for (let i = words.length - 1; i >= 0; i--) out += words[i] + (i > 0 ? ' ' : '');
  return out;
}
```
**Variation:** reverse **each word** but keep the order → `"I evol tpircSavaJ"` →
`s.split(' ').map((w) => w.split('').reverse().join('')).join(' ')`.

### Q9. Longest word in a sentence — Easy
`"I love programming a lot"` → `"programming"`

**With built-ins**
```js
const longestWord = (s) => s.split(' ').reduce((a, b) => (b.length > a.length ? b : a), '');
```
**Without built-ins**
```js
function longestWord(s) {
  let longest = '', current = '';
  for (let i = 0; i <= s.length; i++) {
    if (i === s.length || s[i] === ' ') {             // end of a word
      if (current.length > longest.length) longest = current;
      current = '';
    } else {
      current += s[i];
    }
  }
  return longest;
}
```

### Q10. Are two strings anagrams? — Easy (very common)
`"listen"`, `"silent"` → `true`

**With built-ins**
```js
const sortStr = (s) => s.split('').sort().join('');
const isAnagram = (a, b) => a.length === b.length && sortStr(a) === sortStr(b);
```
**Without built-ins** — count up for one string, count down for the other
```js
function isAnagram(a, b) {
  if (a.length !== b.length) return false;
  const count = {};
  for (let i = 0; i < a.length; i++) count[a[i]] = (count[a[i]] || 0) + 1;
  for (let i = 0; i < b.length; i++) {
    if (!count[b[i]]) return false;            // missing, or used up
    count[b[i]]--;
  }
  return true;
}
```
**Time:** sorting is **O(n log n)**; counting is **O(n)**.

### Q11. Remove duplicate characters — Easy
`"programming"` → `"progamin"`

**With built-ins**
```js
const removeDupChars = (s) => [...new Set(s)].join('');
```
**Without built-ins**
```js
function removeDupChars(s) {
  const seen = {};
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (!seen[s[i]]) { seen[s[i]] = true; out += s[i]; }
  }
  return out;
}
```
**Time O(n).** A `Set` keeps insertion order, so the first occurrence stays.

### Q12. ⭐ String compression — Easy/Medium
`"aaabbcdddd"` → `"a3b2c1d4"`

**With built-ins** (regex groups repeated characters)
```js
const compress = (s) => s.replace(/(.)\1*/g, (run) => run[0] + run.length);
```
**Without built-ins**
```js
function compress(s) {
  if (!s.length) return '';
  let out = '', count = 1;
  for (let i = 1; i <= s.length; i++) {
    if (s[i] === s[i - 1]) {
      count++;
    } else {
      out += s[i - 1] + count;          // the run ended — write it
      count = 1;
    }
  }
  return out;
}
```
**Follow-up:** "return the original if the compressed one is not shorter" →
`return out.length < s.length ? out : s;`

### Q13. Count the words — Easy
`"  hello   world  js "` → `3`

**With built-ins**
```js
const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
```
**Without built-ins** — count the start of each word
```js
function countWords(s) {
  let count = 0, inWord = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== ' ' && !inWord) { count++; inWord = true; }
    else if (s[i] === ' ') inWord = false;
  }
  return count;
}
```
**Trap:** `s.split(' ')` counts empty strings for extra spaces — that is why `/\s+/` and `trim()`.

### Q14. Toggle the case of each letter — Easy
`"Hello JS"` → `"hELLO js"`

**With built-ins**
```js
const toggleCase = (s) =>
  s.split('').map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');
```
**Without built-ins**
```js
function toggleCase(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 65 && code <= 90) out += String.fromCharCode(code + 32);        // A-Z → a-z
    else if (code >= 97 && code <= 122) out += String.fromCharCode(code - 32);  // a-z → A-Z
    else out += s[i];
  }
  return out;
}
```

### Q15. Does the string contain only digits? — Easy
`"12345"` → `true`, `"12a45"` → `false`

**With built-ins**
```js
const isDigits = (s) => /^\d+$/.test(s);
```
**Without built-ins**
```js
function isDigits(s) {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] < '0' || s[i] > '9') return false;      // compare characters directly
  }
  return true;
}
```
**Trap:** `!isNaN(s)` is wrong — `isNaN('')`, `isNaN(' ')` and `isNaN('1e5')` all behave surprisingly.

### Q16. Is one string a rotation of another? — Medium
`"abcde"`, `"cdeab"` → `true`

**With built-ins** — ⭐ the clever trick: every rotation of `a` appears inside `a + a`
```js
const isRotation = (a, b) => a.length === b.length && (a + a).includes(b);
```
**Without built-ins** — try every starting point
```js
function isRotation(a, b) {
  if (a.length !== b.length) return false;
  const n = a.length;
  for (let start = 0; start < n; start++) {
    let match = true;
    for (let i = 0; i < n; i++) {
      if (a[(start + i) % n] !== b[i]) { match = false; break; }   // wrap around with %
    }
    if (match) return true;
  }
  return n === 0;
}
```
**Time:** the manual version is **O(n²)**. Explain the `a + a` trick — interviewers love it.

---
---

# B. NUMBERS

---

### Q17. FizzBuzz — Easy
Print 1 to 100. Multiples of 3 → "Fizz", of 5 → "Buzz", of both → "FizzBuzz".

**With built-ins**
```js
const fizzBuzz = (n) =>
  Array.from({ length: n }, (_, i) => {
    const x = i + 1;
    return (x % 3 === 0 ? 'Fizz' : '') + (x % 5 === 0 ? 'Buzz' : '') || x;
  });
```
**Without built-ins**
```js
function fizzBuzz(n) {
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) console.log('FizzBuzz');     // check 15 FIRST
    else if (i % 3 === 0) console.log('Fizz');
    else if (i % 5 === 0) console.log('Buzz');
    else console.log(i);
  }
}
```
**Trap:** checking `% 3` before `% 15` means "FizzBuzz" is never printed.

### Q18. Factorial — Easy
`5` → `120`

**With built-ins**
```js
const factorial = (n) => Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
```
**Without built-ins** — loop (and the recursive version they may ask for)
```js
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

const factorialRec = (n) => (n <= 1 ? 1 : n * factorialRec(n - 1));
```
**Follow-up:** big numbers → `factorial(25)` loses precision. Use `BigInt`: `let result = 1n; … result *= BigInt(i)`.

### Q19. Fibonacci series — first n numbers — Easy
`7` → `[0, 1, 1, 2, 3, 5, 8]`

**With built-ins**
```js
const fibonacci = (n) =>
  Array.from({ length: n }).reduce((acc, _, i) => (i < 2 ? [...acc, i] : [...acc, acc[i - 1] + acc[i - 2]]), []);
```
**Without built-ins**
```js
function fibonacci(n) {
  const out = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    out.push(a);
    const next = a + b;
    a = b;
    b = next;
  }
  return out;
}
```
**Trap:** the simple recursive `fib(n) = fib(n-1) + fib(n-2)` is **O(2ⁿ)** — very slow. The loop is O(n).

### Q20. Is a number prime? — Easy (very common)
`7` → `true`, `9` → `false`

**Without built-ins** (this one has no real built-in version)
```js
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {          // ⭐ only up to √n
    if (n % i === 0) return false;
  }
  return true;
}
```
**Why √n:** if `n = a × b`, one of them must be ≤ √n. So checking beyond √n finds nothing new.
**Time O(√n).**

### Q21. All primes up to n — Medium
`20` → `[2, 3, 5, 7, 11, 13, 17, 19]`

**Simple version** — reuse Q20
```js
const primesUpTo = (n) => Array.from({ length: n + 1 }, (_, i) => i).filter(isPrime);
```
**Faster version — Sieve of Eratosthenes** (cross out multiples)
```js
function primesUpTo(n) {
  const isComposite = [];
  const primes = [];
  for (let i = 2; i <= n; i++) {
    if (isComposite[i]) continue;
    primes.push(i);
    for (let j = i * i; j <= n; j += i) isComposite[j] = true;   // cross out multiples
  }
  return primes;
}
```
**Time O(n log log n)** — much faster than checking each number separately.

### Q22. Sum of digits — Easy
`1234` → `10`

**With built-ins**
```js
const sumDigits = (n) => String(Math.abs(n)).split('').reduce((sum, d) => sum + Number(d), 0);
```
**Without built-ins** — `% 10` gives the last digit, dividing by 10 removes it
```js
function sumDigits(n) {
  if (n < 0) n = -n;
  let sum = 0;
  while (n > 0) {
    sum += n % 10;
    n = (n - (n % 10)) / 10;       // same as Math.floor(n / 10)
  }
  return sum;
}
```

### Q23. Reverse a number — Easy
`1234` → `4321`, `-120` → `-21`

**With built-ins**
```js
const reverseNumber = (n) => Math.sign(n) * Number(String(Math.abs(n)).split('').reverse().join(''));
```
**Without built-ins**
```js
function reverseNumber(n) {
  const negative = n < 0;
  if (negative) n = -n;
  let reversed = 0;
  while (n > 0) {
    reversed = reversed * 10 + (n % 10);        // add the last digit on the right
    n = (n - (n % 10)) / 10;
  }
  return negative ? -reversed : reversed;
}
```

### Q24. Armstrong number — Easy
`153` → `true` (1³ + 5³ + 3³ = 153)

**With built-ins**
```js
function isArmstrong(n) {
  const digits = String(n).split('').map(Number);
  return digits.reduce((sum, d) => sum + d ** digits.length, 0) === n;
}
```
**Without built-ins**
```js
function isArmstrong(n) {
  let count = 0;
  for (let t = n; t > 0; t = (t - (t % 10)) / 10) count++;      // count the digits

  let sum = 0;
  for (let t = n; t > 0; t = (t - (t % 10)) / 10) {
    const d = t % 10;
    let power = 1;
    for (let i = 0; i < count; i++) power *= d;
    sum += power;
  }
  return sum === n;
}
```

### Q25. GCD and LCM — Easy
`gcd(12, 18)` → `6`, `lcm(4, 6)` → `12`

```js
function gcd(a, b) {
  while (b !== 0) {
    const r = a % b;              // Euclid: gcd(a, b) = gcd(b, a % b)
    a = b;
    b = r;
  }
  return a;
}

const lcm = (a, b) => (a / gcd(a, b)) * b;     // divide first — avoids overflow
```
**Time O(log n).**

### Q26. Swap two variables without a third variable — Easy
**With destructuring**
```js
let a = 5, b = 10;
[a, b] = [b, a];
```
**With arithmetic** (the answer they want when they say "without a temp")
```js
a = a + b;   // 15
b = a - b;   // 5
a = a - b;   // 10
```
**Say:** "Destructuring is what I would use in real code; the arithmetic trick can overflow with huge
numbers."

### Q27. Count the digits in a number — Easy
`12345` → `5`

**With built-ins**
```js
const countDigits = (n) => String(Math.abs(n)).length;
```
**Without built-ins**
```js
function countDigits(n) {
  if (n === 0) return 1;
  if (n < 0) n = -n;
  let count = 0;
  while (n > 0) {
    count++;
    n = (n - (n % 10)) / 10;
  }
  return count;
}
```
**Trap:** forgetting that `0` has one digit.
---
---

# C. ARRAYS

---

### Q28. Find the largest and smallest number — Easy
`[3, 9, 1, 7]` → `max 9, min 1`

**With built-ins**
```js
const max = Math.max(...arr);
const min = Math.min(...arr);
```
**Without built-ins**
```js
function minMax(arr) {
  let min = arr[0], max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
    if (arr[i] < min) min = arr[i];
  }
  return { min, max };
}
```
**Traps:** start from `arr[0]`, not `0` (an all-negative array would give a wrong max). `Math.max(...arr)`
can crash with a **stack overflow** on very large arrays — the loop cannot.

### Q29. Sum and average — Easy
**With built-ins**
```js
const sum = arr.reduce((acc, x) => acc + x, 0);
const avg = arr.length ? sum / arr.length : 0;
```
**Without built-ins**
```js
function sumAndAverage(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return { sum, avg: arr.length ? sum / arr.length : 0 };
}
```
**Trap:** always give `reduce` a starting value (`0`) — on an empty array without it, `reduce` throws.

### Q30. ⭐ Second largest number — Easy (very common)
`[10, 5, 20, 20, 8]` → `10`

**With built-ins**
```js
const secondLargest = (arr) => [...new Set(arr)].sort((a, b) => b - a)[1] ?? null;
```
**Without built-ins** — one pass, remember the top two
```js
function secondLargest(arr) {
  let first = -Infinity, second = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const n = arr[i];
    if (n > first) {
      second = first;
      first = n;
    } else if (n > second && n !== first) {
      second = n;
    }
  }
  return second === -Infinity ? null : second;
}
```
**Time:** sort is **O(n log n)**; the loop is **O(n)**. **Trap:** duplicates of the largest (`20, 20`).

### Q31. ⭐ Remove duplicates from an array — Easy (the most asked)
`[1, 2, 2, 3, 1]` → `[1, 2, 3]`

**With built-ins** — three ways, know all three
```js
const unique1 = [...new Set(arr)];
const unique2 = arr.filter((x, i) => arr.indexOf(x) === i);     // O(n²) — slow on big arrays
const unique3 = arr.reduce((acc, x) => (acc.includes(x) ? acc : [...acc, x]), []);
```
**Without built-ins**
```js
function unique(arr) {
  const seen = {};
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (!seen[arr[i]]) {
      seen[arr[i]] = true;
      out.push(arr[i]);
    }
  }
  return out;
}
```
**Trap for the manual version:** object keys become strings, so `1` and `'1'` count as the same. A `Set`
does not have this problem.

### Q32. Count occurrences of each element — Easy
`['a', 'b', 'a', 'c', 'a']` → `{ a: 3, b: 1, c: 1 }`

**With built-ins**
```js
const counts = arr.reduce((acc, x) => ({ ...acc, [x]: (acc[x] || 0) + 1 }), {});
```
**Without built-ins**
```js
function countOccurrences(arr) {
  const counts = {};
  for (let i = 0; i < arr.length; i++) counts[arr[i]] = (counts[arr[i]] || 0) + 1;
  return counts;
}
```
**Note:** the spread version creates a new object each time — O(n²). Mutating `acc` is O(n).

### Q33. ⭐ Find the missing number from 1 to n — Easy
`[1, 2, 4, 5, 6]` → `3`

**Idea:** the sum of 1..n is `n × (n + 1) / 2`. Subtract the actual sum; what is left is the missing number.

**With built-ins**
```js
function findMissing(arr) {
  const n = arr.length + 1;
  return (n * (n + 1)) / 2 - arr.reduce((a, b) => a + b, 0);
}
```
**Without built-ins**
```js
function findMissing(arr) {
  const n = arr.length + 1;
  let actual = 0;
  for (let i = 0; i < arr.length; i++) actual += arr[i];
  return (n * (n + 1)) / 2 - actual;
}
```
**Time O(n), space O(1).** Much better than sorting.

### Q34. ⭐ Sort an array without `sort()` — Easy/Medium
**With built-ins**
```js
const sorted = [...arr].sort((a, b) => a - b);        // ⭐ comparator needed for numbers
```
**Without built-ins — bubble sort** (the one to write in an interview)
```js
function bubbleSort(input) {
  const arr = [...input];                               // do not change the caller's array
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];    // swap neighbours
        swapped = true;
      }
    }
    if (!swapped) break;                                // already sorted — stop early
  }
  return arr;
}
```
**Say:** "Bubble sort is O(n²). The built-in sort is O(n log n). The `swapped` flag makes an
already-sorted array O(n)."
**Trap:** `[10, 1, 3].sort()` → `[1, 10, 3]` — default sort compares **as strings**.

### Q35. Merge two sorted arrays — Easy
`[1, 3, 5]`, `[2, 4, 6]` → `[1, 2, 3, 4, 5, 6]`

**With built-ins**
```js
const merged = [...a, ...b].sort((x, y) => x - y);     // O((n+m) log(n+m))
```
**Without built-ins** — two pointers, O(n + m)
```js
function mergeSorted(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);     // leftovers
  while (j < b.length) out.push(b[j++]);
  return out;
}
```
**Say:** "Since both are already sorted, two pointers is faster than sorting again."

### Q36. Intersection — elements in both arrays — Easy
`[1, 2, 3, 4]`, `[3, 4, 5]` → `[3, 4]`

**With built-ins**
```js
const intersection = (a, b) => {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
};
```
**Without built-ins**
```js
function intersection(a, b) {
  const inB = {}, added = {}, out = [];
  for (let i = 0; i < b.length; i++) inB[b[i]] = true;
  for (let i = 0; i < a.length; i++) {
    if (inB[a[i]] && !added[a[i]]) { out.push(a[i]); added[a[i]] = true; }
  }
  return out;
}
```
**Time O(n + m).** `a.filter((x) => b.includes(x))` also works but is **O(n × m)**.

### Q37. Union — all unique elements from both — Easy
```js
const union = (a, b) => [...new Set([...a, ...b])];            // with built-ins

function union(a, b) {                                          // without
  const seen = {}, out = [];
  const add = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); }
    }
  };
  add(a);
  add(b);
  return out;
}
```

### Q38. Difference — in A but not in B — Easy
`[1, 2, 3, 4]`, `[2, 4]` → `[1, 3]`
```js
const difference = (a, b) => {                                 // with built-ins
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
};

function difference(a, b) {                                    // without
  const inB = {}, out = [];
  for (let i = 0; i < b.length; i++) inB[b[i]] = true;
  for (let i = 0; i < a.length; i++) if (!inB[a[i]]) out.push(a[i]);
  return out;
}
```

### Q39. ⭐ Rotate an array by k steps — Easy/Medium
`[1, 2, 3, 4, 5]`, k = 2 → `[4, 5, 1, 2, 3]` (rotate right)

**With built-ins**
```js
function rotate(arr, k) {
  k = k % arr.length;                          // ⭐ k can be bigger than the length
  return [...arr.slice(-k), ...arr.slice(0, -k)];
}
```
**Without built-ins** — place each element at its new index
```js
function rotate(arr, k) {
  const n = arr.length;
  if (n === 0) return [];
  k = k % n;
  const out = [];
  for (let i = 0; i < n; i++) out[(i + k) % n] = arr[i];
  return out;
}
```
**Trap:** `k` can be larger than the length — always use `k % n`. **Follow-up (in place, O(1) space):** reverse all, reverse the first k,
reverse the rest.

### Q40. ⭐ Flatten a nested array — Easy/Medium
`[1, [2, [3, [4]], 5]]` → `[1, 2, 3, 4, 5]`

**With built-ins**
```js
const flat = arr.flat(Infinity);
```
**Without built-ins** — recursion
```js
function flatten(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      const inner = flatten(arr[i]);                // flatten the inside first
      for (let j = 0; j < inner.length; j++) out.push(inner[j]);
    } else {
      out.push(arr[i]);
    }
  }
  return out;
}
```
**Follow-up:** "without recursion" → use a stack: push items, and when an item is an array, push its
children instead.

### Q41. Split an array into chunks — Easy
`[1, 2, 3, 4, 5]`, size 2 → `[[1, 2], [3, 4], [5]]`

**With built-ins**
```js
const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
```
**Without built-ins**
```js
function chunk(arr, size) {
  const out = [];
  let current = [];
  for (let i = 0; i < arr.length; i++) {
    current.push(arr[i]);
    if (current.length === size) { out.push(current); current = []; }
  }
  if (current.length) out.push(current);          // the last, smaller chunk
  return out;
}
```

### Q42. ⭐ Find pairs that add up to a target — Easy (Two Sum)
`[2, 7, 11, 15]`, target 9 → `[[2, 7]]`

**Brute force** — every pair, O(n²)
```js
function pairsWithSum(arr, target) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] + arr[j] === target) out.push([arr[i], arr[j]]);
    }
  }
  return out;
}
```
**Better** — remember what you have seen, O(n)
```js
function pairsWithSum(arr, target) {
  const seen = {}, out = [];
  for (let i = 0; i < arr.length; i++) {
    const need = target - arr[i];
    if (seen[need]) out.push([need, arr[i]]);
    seen[arr[i]] = true;
  }
  return out;
}
```
**Say both.** Starting with brute force and then improving it is exactly what they want to see.

### Q43. Move all zeros to the end — Easy
`[0, 1, 0, 3, 12]` → `[1, 3, 12, 0, 0]`

**With built-ins**
```js
const moveZeros = (arr) => [...arr.filter((x) => x !== 0), ...arr.filter((x) => x === 0)];
```
**Without built-ins** — in place
```js
function moveZeros(arr) {
  let insert = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) arr[insert++] = arr[i];   // pack non-zeros to the front
  }
  while (insert < arr.length) arr[insert++] = 0; // fill the rest with zeros
  return arr;
}
```

### Q44. Reverse an array (in place) — Easy
**With built-ins**
```js
arr.reverse();                 // ⚠️ changes the original
const copy = [...arr].reverse();  // or arr.toReversed() in new runtimes
```
**Without built-ins** — swap from both ends
```js
function reverseInPlace(arr) {
  for (let l = 0, r = arr.length - 1; l < r; l++, r--) {
    const temp = arr[l];
    arr[l] = arr[r];
    arr[r] = temp;
  }
  return arr;
}
```

### Q45. Is the array sorted? — Easy
```js
const isSorted = (arr) => arr.every((x, i) => i === 0 || arr[i - 1] <= x);   // with built-ins

function isSorted(arr) {                                                      // without
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) return false;
  }
  return true;
}
```

### Q46. Find the duplicate elements — Easy
`[1, 2, 3, 2, 4, 1]` → `[2, 1]`

**With built-ins**
```js
const duplicates = (arr) => [...new Set(arr.filter((x, i) => arr.indexOf(x) !== i))];
```
**Without built-ins**
```js
function duplicates(arr) {
  const count = {}, out = [];
  for (let i = 0; i < arr.length; i++) {
    count[arr[i]] = (count[arr[i]] || 0) + 1;
    if (count[arr[i]] === 2) out.push(arr[i]);    // add only the first time it repeats
  }
  return out;
}
```

### Q47. Keep even numbers and square them — Easy
`[1, 2, 3, 4]` → `[4, 16]`

**With built-ins**
```js
const result = arr.filter((x) => x % 2 === 0).map((x) => x * x);
```
**Without built-ins**
```js
function evenSquares(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) out.push(arr[i] * arr[i]);
  }
  return out;
}
```
**Say:** "The chained version is easier to read. The loop does it in one pass without a middle array —
it only matters for very large data."

---
---

# D. OBJECTS & ARRAYS OF OBJECTS

> These are the most **realistic** questions — real API data is an array of objects.

```js
const patients = [
  { id: 1, name: 'Ravi',  city: 'Pune',   age: 34, spent: 1200 },
  { id: 2, name: 'Asha',  city: 'Mumbai', age: 28, spent: 800 },
  { id: 3, name: 'Rahul', city: 'Pune',   age: 45, spent: 2500 },
  { id: 4, name: 'Sita',  city: 'Delhi',  age: 31, spent: 400 },
];
```

### Q48. Count the keys of an object — Easy
```js
const count = Object.keys(obj).length;            // with built-ins

function countKeys(obj) {                         // without
  let count = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) count++;   // skip inherited keys
  }
  return count;
}
```

### Q49. ⭐ Group by a property — Easy (very common)
`patients` grouped by city → `{ Pune: [Ravi, Rahul], Mumbai: [Asha], Delhi: [Sita] }`

**With built-ins**
```js
const byCity = patients.reduce((acc, p) => {
  (acc[p.city] ||= []).push(p);
  return acc;
}, {});
// newer runtimes: Object.groupBy(patients, (p) => p.city)
```
**Without built-ins**
```js
function groupBy(items, key) {
  const out = {};
  for (let i = 0; i < items.length; i++) {
    const k = items[i][key];
    if (!out[k]) out[k] = [];
    out[k].push(items[i]);
  }
  return out;
}
```

### Q50. ⭐ Sort an array of objects by a property — Easy
```js
const byAge = [...patients].sort((a, b) => a.age - b.age);               // numbers
const byName = [...patients].sort((a, b) => a.name.localeCompare(b.name)); // strings
const bySpentDesc = [...patients].sort((a, b) => b.spent - a.spent);      // highest first
```
**Without built-ins** — the same bubble sort as Q34, comparing `arr[j].age > arr[j + 1].age`.
**Trap:** `sort` **changes the original array** — copy it first with `[...patients]`.

### Q51. Find and filter objects — Easy
```js
const rahul  = patients.find((p) => p.name === 'Rahul');         // first match, or undefined
const inPune = patients.filter((p) => p.city === 'Pune');       // all matches
const anyOld = patients.some((p) => p.age > 40);                // true / false
const allAdults = patients.every((p) => p.age >= 18);

function findByName(items, name) {                              // "find" without built-ins
  for (let i = 0; i < items.length; i++) {
    if (items[i].name === name) return items[i];
  }
  return undefined;
}
```

### Q52. ⭐ Total of a property (e.g. revenue) — Easy
```js
const total = patients.reduce((sum, p) => sum + p.spent, 0);    // with built-ins

function totalSpent(items) {                                    // without
  let sum = 0;
  for (let i = 0; i < items.length; i++) sum += items[i].spent;
  return sum;
}
```
**Follow-up:** total per city → combine Q49 and this.

### Q53. ⭐ Array → lookup object by id — Easy
`[{ id: 1, … }, { id: 2, … }]` → `{ 1: {…}, 2: {…} }`

**Why:** finding by id in an array is O(n) each time. A lookup object (or `Map`) makes it O(1).
```js
const byId = Object.fromEntries(patients.map((p) => [p.id, p]));   // with built-ins
const byIdMap = new Map(patients.map((p) => [p.id, p]));

function indexById(items) {                                        // without
  const out = {};
  for (let i = 0; i < items.length; i++) out[items[i].id] = items[i];
  return out;
}
```
**Say:** "When I need to match two lists — for example appointments with patients — I build a lookup
first. Otherwise a `find` inside a loop is O(n × m)."

### Q54. Invert an object (swap keys and values) — Easy
`{ a: 1, b: 2 }` → `{ 1: 'a', 2: 'b' }`
```js
const inverted = Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));   // with

function invert(obj) {                                                               // without
  const out = {};
  for (const key in obj) out[obj[key]] = key;
  return out;
}
```

### Q55. Merge two objects — Easy
```js
const merged = { ...defaults, ...userSettings };        // later wins
const merged2 = Object.assign({}, defaults, userSettings);

function merge(a, b) {                                  // without
  const out = {};
  for (const key in a) out[key] = a[key];
  for (const key in b) out[key] = b[key];               // b overrides a
  return out;
}
```
**Trap:** spread is a **shallow** merge — nested objects are replaced, not merged. For nested settings,
write a recursive deep merge, or use `structuredClone` plus a merge helper.

---

## Self-check — can you do these in under 5 minutes each, without looking?

- [ ] Reverse a string and check a palindrome — both ways
- [ ] Count characters, then find the most frequent and first unique
- [ ] Anagram check with counting (not sorting)
- [ ] String compression `aaabb → a3b2`
- [ ] Prime check up to √n, and FizzBuzz with the right order
- [ ] Second largest in one pass
- [ ] Remove duplicates three ways, plus the manual version
- [ ] Missing number using the sum formula
- [ ] Bubble sort with the early-stop flag
- [ ] Merge two sorted arrays with two pointers
- [ ] Rotate an array with `% n`
- [ ] Flatten a nested array with recursion
- [ ] Group an array of objects by a property, and build a lookup by id
