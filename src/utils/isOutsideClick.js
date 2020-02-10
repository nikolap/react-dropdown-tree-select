const getPath = e => {
  const easyPath = e.path || (e.composedPath && e.composedPath())
  if (easyPath) return easyPath

  let elem = e.target
  const path = [elem]

  while (elem.parentElement) {
    elem = elem.parentElement
    path.unshift(elem)
  }

  return path
}

export default (e, node) => {
  if (!(e instanceof Event)) return false
  return !getPath(e).some(eventNode => eventNode === node)
}
