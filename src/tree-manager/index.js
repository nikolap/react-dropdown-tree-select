import getPartialState from './getPartialState'

import { isEmpty } from '../utils'
import flattenTree from './flatten-tree'

class TreeManager {
  constructor(tree, simple, showPartialState) {
    this._src = tree
    const { list, defaultValues } = flattenTree(JSON.parse(JSON.stringify(tree)), simple, showPartialState)
    this.tree = list
    this.defaultValues = defaultValues
    this.simpleSelect = simple
    this.showPartialState = showPartialState
    this.searchMaps = new Map()
    this.lastClicked = null
  }

  getNodeById(id) {
    return this.tree.get(id)
  }

  getMatches(searchTerm) {
    if (this.searchMaps.has(searchTerm)) {
      return this.searchMaps.get(searchTerm)
    }

    let proximity = -1
    let closestMatch = searchTerm
    this.searchMaps.forEach((m, key) => {
      if (searchTerm.startsWith(key) && key.length > proximity) {
        proximity = key.length
        closestMatch = key
      }
    })

    const matches = []

    if (closestMatch !== searchTerm) {
      const superMatches = this.searchMaps.get(closestMatch)
      superMatches.forEach(key => {
        const node = this.getNodeById(key)
        if (node.label.toLowerCase().indexOf(searchTerm) >= 0) {
          matches.push(node._id)
        }
      })
    } else {
      this.tree.forEach(node => {
        if (node.label.toLowerCase().indexOf(searchTerm) >= 0) {
          matches.push(node._id)
        }
      })
    }

    this.searchMaps.set(searchTerm, matches)
    return matches
  }

  setChildMatchStatus(id) {
    if (id !== undefined) {
      const node = this.getNodeById(id)
      node.matchInChildren = true
      this.setChildMatchStatus(node._parent)
    }
  }

  filterTree(searchTerm) {
    const matches = this.getMatches(searchTerm.toLowerCase())

    this.tree.forEach(node => {
      node.hide = true
      node.matchInChildren = false
    })

    matches.forEach(m => {
      const node = this.getNodeById(m)
      node.hide = false
      this.setChildMatchStatus(node._parent)
    })

    const allNodesHidden = matches.length === 0
    return { allNodesHidden, tree: this.tree }
  }

  restoreNodes() {
    this.tree.forEach(node => {
      node.hide = false
    })

    return this.tree
  }

  restoreDefaultValues() {
    this.defaultValues.forEach(id => {
      this.setNodeCheckedState(id, true, false)
    })

    return this.tree
  }

  togglePreviousChecked(id) {
    const prevChecked = this.currentChecked

    // if id is same as previously selected node, then do nothing (since it's state is already set correctly by setNodeCheckedState)
    // but if they ar not same, then toggle the previous one
    if (prevChecked && prevChecked !== id) this.getNodeById(prevChecked).checked = false

    this.currentChecked = id
  }

  regularNodeCheck(id, checked, node) {
    node.checked = checked

    if (this.showPartialState) {
      node.partial = false
    }

    this.toggleChildren(id, checked)

    if (this.showPartialState) {
      this.partialCheckParents(node)
    }

    if (!checked) {
      this.unCheckParents(node)
    }
  }

  setNodeCheckedState(id, checked, shiftDown) {
    const node = this.getNodeById(id)
    
    if (this.simpleSelect) {
      node.checked = checked

      if (this.showPartialState) {
        node.partial = false
      }

      this.togglePreviousChecked(id)
    } else {
      this.regularNodeCheck(id, checked, node)

      if (shiftDown && this.lastClicked != null) {
        this.toggleBetween(id, this.lastClicked, checked)
      }

      this.lastClicked = id;
    }
  }

  toggleBetween(id1, id2, checked) {
    let treeList = Array.from(this.tree, ([key, value]) => value).filter(v => !v.hide)
    let index1 = treeList.indexOf(this.getNodeById(id1))
    let index2 = treeList.indexOf(this.getNodeById(id2))
    let [start, end] = [index1, index2].sort(function(a, b){return a-b})
    let range = Array(end - start + 1).fill().map((_, idx) => start + idx)
    
    range.forEach(index => {
      let node = treeList[index]
      let id = node._id
      this.regularNodeCheck(id, checked, node)
    })
  }

  /**
   * Walks up the tree unchecking parent nodes
   * @param  {[type]} node [description]
   * @return {[type]}      [description]
   */
  unCheckParents(node) {
    let parent = node._parent
    while (parent) {
      const next = this.getNodeById(parent)
      next.checked = false
      next.partial = getPartialState(next, '_children', this.getNodeById.bind(this))
      parent = next._parent
    }
  }

  /**
   * Walks up the tree setting partial state on parent nodes
   * @param  {[type]} node [description]
   * @return {[type]}      [description]
   */
  partialCheckParents(node) {
    let parent = node._parent
    while (parent) {
      const next = this.getNodeById(parent)
      next.checked = next._children.every(c => this.getNodeById(c).checked)
      next.partial = getPartialState(next, '_children', this.getNodeById.bind(this))
      parent = next._parent
    }
  }

  toggleChildren(id, state) {
    const node = this.getNodeById(id)
    node.checked = state

    if (this.showPartialState) {
      node.partial = false
    }

    if (!isEmpty(node._children)) {
      node._children.forEach(id => this.toggleChildren(id, state))
    }
  }

  toggleNodeExpandState(id) {
    const node = this.getNodeById(id)
    node.expanded = !node.expanded
    if (!node.expanded) this.collapseChildren(node)
    return this.tree
  }

  collapseChildren(node) {
    node.expanded = false
    if (!isEmpty(node._children)) {
      node._children.forEach(c => this.collapseChildren(this.getNodeById(c)))
    }
  }

  getTags() {
    const tags = []
    const visited = {}
    const markSubTreeVisited = node => {
      visited[node._id] = true
      if (!isEmpty(node._children)) node._children.forEach(c => markSubTreeVisited(this.getNodeById(c)))
    }

    this.tree.forEach((node, key) => {
      if (visited[key]) return

      if (node.checked) {
        // Parent node, so no need to walk children
        tags.push(node)
        markSubTreeVisited(node)
      } else {
        visited[key] = true
      }
    })
    return tags
  }
}

export default TreeManager
