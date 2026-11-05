// 验证 26284 期容错计算
const decompText = `43908,12675
46031,72589
28193,05764
39487,61250
07258,94613
97812,06345
19207,65438
93521,04768
89742,05631
51937,24608
90718,25634
47928,65130
17625,49083
39487,61250
07258,94613
70941,68235
87064,39251
57639,40812
85974,61230
31584,96072`;

// 本期高倍号码（用户提供）
const gaobeiText = `125 126 128 129 134 135 136 137 142 143
145 147 148 152 153 154 156 157 158 159
162 163 165 167 168 169 173 174 175 176
178 179 182 184 185 186 187 192 195 196
197 235 236 237 238 239 241 245 247 248
249 251 253 254 256 257 258 259 261 263
265 267 268 269 273 274 275 276 278 279
281 283 284 285 286 287 291 293 294 295
296 297 325 326 327 329 341 347 348 349
351 352 356 357 359 361 362 365 367 369
371 372 374 375 376 378 379 382 384 385
387 392 394 395 396 397 425 427 428 429
431 437 438 439 451 452 457 458 459 467
469 471 472 473 475 476 478 479 481 482
483 485 487 492 493 495 496 497 521 523
524 526 527 528 529 531 532 536 537 538
539 541 542 547 548 549 561 562 563 568
569 571 572 573 574 578 579 581 582 583
584 586 587 591 592 593 594 596 597 621
623 625 627 628 629 631 632 635 637 639
647 649 651 652 653 658 659 671 672 673
674 679 681 682 685 691 692 693 694 695
697 723 724 725 726 728 729 731 732 734
735 736 738 739 741 742 743 745 746 748
749 751 752 753 754 758 759 761 762 763
764 769 781 782 783 784 785 791 792 793
794 795 796 821 824 825 826 827 832 834
835 837 841 842 843 845 847 851 852 854
856 857 861 862 865 871 872 873 874 875
921 923 924 925 926 927 932 934 935 936
937 942 943 945 946 947 951 952 953 954
956 957 961 962 963 964 965 967 971 972
973 974 975 976`;

function parseDecompGroups(text) {
  const groups = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,，]/);
    if (parts.length !== 2) continue;
    const aDigits = parts[0].trim().split('').filter(c => /\d/.test(c)).map(Number);
    const bDigits = parts[1].trim().split('').filter(c => /\d/.test(c)).map(Number);
    if (aDigits.length !== 5 || bDigits.length !== 5) continue;
    const a = new Set(aDigits);
    const b = new Set(bDigits);
    if (a.size !== 5 || b.size !== 5) continue;
    if (aDigits.some(d => b.has(d))) continue;
    groups.push({ a, b, raw: trimmed });
  }
  return groups;
}

function computeErrorCount(digits, groups) {
  let err = 0;
  for (const g of groups) {
    let inA = 0;
    for (const d of digits) if (g.a.has(d)) inA++;
    if (inA === 0 || inA === digits.length) err++;
  }
  return err;
}

const groups = parseDecompGroups(decompText);
const gaobei = gaobeiText.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);

console.log(`本期高倍号码：${gaobei.length} 注`);

// 计算每个号码的 errorCount
const buckets = {};
for (const num of gaobei) {
  const digits = num.split('').map(Number);
  const err = computeErrorCount(digits, groups);
  if (!buckets[err]) buckets[err] = [];
  buckets[err].push(num);
}

console.log('\nerrorCount 分布:');
for (let i = 0; i <= 8; i++) {
  const count = buckets[i] ? buckets[i].length : 0;
  console.log(`  errorCount=${i}: ${count} 注`);
}

// 容错1 = errorCount === 1
const rongCuo1 = buckets[1] || [];
console.log(`\n容错1号码 (${rongCuo1.length} 注):`);
console.log(rongCuo1.join(' '));

// 用户期望的容错1
const expected = '137 142 145 147 154 158 173 174 185 241 245 254 269 296 367 371 376 425 451 452 459 471 495 524 541 542 549 569 581 594 596 629 637 659 673 692 695 731 736 741 763 851 926 945 954 956 962 965'.split(/\s+/);
const expectedSet = new Set(expected);
const rongCuo1Set = new Set(rongCuo1);

const missing = expected.filter(n => !rongCuo1Set.has(n));
const extra = rongCuo1.filter(n => !expectedSet.has(n));

console.log(`\n对比用户期望的${expected.length}注:`);
console.log(`  缺失：${missing.length} 注`, missing);
console.log(`  多余：${extra.length} 注`, extra.slice(0, 20));
