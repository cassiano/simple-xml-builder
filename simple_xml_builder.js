class SimpleXMLBuilder {
  constructor(fn) {
    if (fn) {
      this.build(fn)
    } else {
      this.reset()
    }
  }

  build(fn) {
    this.reset()
    fn(this.createProxy())
  }

  str() {
    return this.rootElement.str()
  }

  /////////////////////
  // Private methods //
  /////////////////////

  reset() {
    this.rootElement = undefined
    this.elements = []
    this.currentDepth = 0
  }

  createProxy() {
    const proxy = new Proxy(this, {
      get(target, name) {
        return (...args) => {
          let additionalParams, fn

          switch (typeof args[0]) {
            case 'object':
              additionalParams = [args[0], undefined]
              fn = args[1]
              break
            case 'function':
              additionalParams = [undefined, undefined]
              fn = args[0]
              break
            default: // args[0] is probably a primitive value.
              // Ok if args[1] is undefined here. Same applies to args[0].
              additionalParams = [args[1], args[0]]
              fn = undefined
          }

          const newElement = new XMLElement(name, ...additionalParams)

          target.elements.push([target.currentDepth, newElement])

          target.rootElement = target.rootElement || newElement

          if (!fn) return

          target.processChildrenElements(() => {
            const previousElements = [...target.elements]
            const result = fn(proxy)

            // Any new elements added?
            if (target.elements.length > previousElements.length) {
              const isSameItem = ([depthA, elementA], [depthB, elementB]) =>
                depthA === depthB && elementA === elementB

              const addedElements = arraysDiff(
                target.elements,
                previousElements,
                isSameItem
              )
                .filter(([depth, _]) => depth === target.currentDepth)
                .map(([_, element]) => element)

              newElement.children = addedElements
            } else {
              // Assume the block returned a primitive value (number, string etc) instead.
              newElement.children = result
            }
          })
        }
      },
    })

    return proxy
  }

  processChildrenElements(fn) {
    this.currentDepth++
    fn()
    this.currentDepth--
  }
}

const INDENTATION_SPACING = 2

class XMLElement {
  constructor(name, attrs, children) {
    this.name = name
    this.attrs = attrs
    this.children = children
  }

  str(depth = 0) {
    if (this.children !== undefined) {
      const childrenAsString = Array.isArray(this.children)
        ? this.children.map(child => child.str(depth + 1)).join('\n')
        : [this.indentation(depth + 1), this.children].join('')

      return [
        this.indentation(depth) + this.openingTag(),
        childrenAsString,
        this.indentation(depth) + this.closingTag(),
      ].join('\n')
    } else {
      return this.indentation(depth) + this.openingTag(true)
    }
  }

  indentation(depth) {
    return ' '.repeat(INDENTATION_SPACING * depth)
  }

  openingTag(selfClosing = false) {
    const attrsAsString =
      this.attrs !== undefined ? ' ' + this.attrsAsKeyValuePairsString() : ''

    return ['<', this.name, attrsAsString, selfClosing ? ' /' : '', '>'].join(
      ''
    )
  }

  closingTag() {
    return ['</', this.name, '>'].join('')
  }

  attrsAsKeyValuePairsString() {
    return Object.entries(this.attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
  }
}

///////////////////////
// Utility functions //
///////////////////////

const arraysDiff = (left, right, comparisonFn) =>
  left.filter(
    leftItem => !right.find(rightItem => comparisonFn(leftItem, rightItem))
  )

function times(count, fn) {
  const result = []

  for (let i = 0; i < count; i++) {
    if (fn === undefined) {
      result.push(i)
    } else {
      fn(i)
    }
  }

  return fn === undefined ? result : count
}

function rand(limit) {
  return Math.trunc(Math.random() * limit)
}

const builder = new SimpleXMLBuilder(xml => {
  xml.document({ type: 'xml', use: 'example' }, () => {
    xml.description('This is an example of using SimpleXMLBuilder2.')
    xml.next_meeting({ date: new Date() }, () => {
      xml.agenda('Nothing of importance will be decided.')
      xml.clearance({ level: 'classified' })
    })
  })
})

console.log(builder.str())

builder.build(xml => {
  xml.html({ lang: 'en-US' }, () => {
    xml.head(() => {
      xml.title('Just a moment...')
      xml.link('Some link', {
        href: '/cdn-cgi/styles/challenges.css',
        rel: 'stylesheet',
      })
    })
    xml.body({ class: 'no-js' }, () => {
      xml.div({ class: 'main-wrapper', role: 'main' }, () => 'Some div')
      xml.br()
    })
  })
})

console.log()
console.log(builder.str())

builder.build(xml => {
  xml.report(() => {
    xml.name(() => 'Annual Report')
    xml.class(() => 'Class of 94')
    times(12, i => {
      xml.amounts({ month: i + 1 }, () => {
        xml.expenses(rand(1000))
        xml.revenue(rand(1000))
      })
    })
  })
})

console.log()
console.log(builder.str())
