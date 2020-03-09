export const currencyToString = (num = 0) => {
  const numArr = num.toString().split('');
  numArr.reverse();

  let newArr = [],
    tmp = '';
  for (const v of numArr) {
    if (tmp.length === 3) {
      newArr.push(tmp);
      tmp = '';
    }
    tmp = v + tmp;
  }

  newArr.push(tmp);
  newArr.reverse();

  return '¥ ' + newArr.join(',');
};
