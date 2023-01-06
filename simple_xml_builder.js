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
        return (arg1, arg2) => {
          let additionalXMLElementParams, fn

          switch (typeof arg1) {
            case 'object':
              additionalXMLElementParams = [arg1, undefined]
              fn = arg2
              break
            case 'function':
              additionalXMLElementParams = [undefined, undefined]
              fn = arg1
              break
            default: // arg1 is probably a primitive value. Ok if any/both args are undefined here.
              additionalXMLElementParams = [arg2, arg1]
              fn = undefined
          }

          const newElement = new XMLElement(name, ...additionalXMLElementParams)

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
        : this.indentation(depth + 1) + this.children.toString()

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

    return `<${this.name}${attrsAsString}${selfClosing ? ' /' : ''}>`
  }

  closingTag() {
    return `</${this.name}>`
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

/*
<document type="xml" use="example">
  <description>
    This is an example of using SimpleXMLBuilder2.
  </description>
  <next_meeting date="Thu Jan 05 2023 01:15:29 GMT-0300 (Brasilia Standard Time)">
    <agenda>
      Nothing of importance will be decided.
    </agenda>
    <clearance level="classified" />
  </next_meeting>
</document>
*/

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

/*
<html lang="en-US">
  <head>
    <title>
      Just a moment...
    </title>
    <link href="/cdn-cgi/styles/challenges.css" rel="stylesheet">
      Some link
    </link>
  </head>
  <body class="no-js">
    <div class="main-wrapper" role="main">
      Some div
    </div>
    <br />
  </body>
</html>
*/

console.log()
console.log(builder.str())

builder.build(xml => {
  xml.report(() => {
    xml.name(() => 'Annual Report')
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

/*
<report>
  <name>
    Annual Report
  </name>
  <amounts month="1">
    <expenses>
      594
    </expenses>
    <revenue>
      993
    </revenue>
  </amounts>
  <amounts month="2">
    <expenses>
      299
    </expenses>
    <revenue>
      546
    </revenue>
  </amounts>
  <amounts month="3">
    <expenses>
      356
    </expenses>
    <revenue>
      768
    </revenue>
  </amounts>
  <amounts month="4">
    <expenses>
      323
    </expenses>
    <revenue>
      612
    </revenue>
  </amounts>
  <amounts month="5">
    <expenses>
      319
    </expenses>
    <revenue>
      233
    </revenue>
  </amounts>
  <amounts month="6">
    <expenses>
      939
    </expenses>
    <revenue>
      684
    </revenue>
  </amounts>
  <amounts month="7">
    <expenses>
      83
    </expenses>
    <revenue>
      485
    </revenue>
  </amounts>
  <amounts month="8">
    <expenses>
      33
    </expenses>
    <revenue>
      230
    </revenue>
  </amounts>
  <amounts month="9">
    <expenses>
      591
    </expenses>
    <revenue>
      165
    </revenue>
  </amounts>
  <amounts month="10">
    <expenses>
      9
    </expenses>
    <revenue>
      4
    </revenue>
  </amounts>
  <amounts month="11">
    <expenses>
      155
    </expenses>
    <revenue>
      120
    </revenue>
  </amounts>
  <amounts month="12">
    <expenses>
      866
    </expenses>
    <revenue>
      127
    </revenue>
  </amounts>
</report>
*/
