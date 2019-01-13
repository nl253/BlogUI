function randStep(min = 0, max = 40) {
  return min + Math.round(Math.random() * (max - min));
}

export {randStep};
