type XMLBuilderPrimitiveType = string | number | boolean

type XMLBuilderFnType = (
  xml: SimpleXMLBuilder
) => void | XMLBuilderPrimitiveType

class SimpleXMLBuilder {
  public rootElement?: XMLElement
  private elements!: [number, XMLElement][]
  private currentDepth!: number

  constructor(fn: (xml: SimpleXMLBuilder) => void) {
    if (fn) {
      this.build(fn)
    } else {
      this.reset()
    }
  }

  build(fn: (xml: SimpleXMLBuilder) => void) {
    this.reset()
    fn(this.createProxy())
  }

  str(): string | undefined {
    return this.rootElement?.str()
  }

  /////////////////////
  // Private methods //
  /////////////////////

  reset(): void {
    this.rootElement = undefined
    this.elements = []
    this.currentDepth = 0
  }

  createProxy(): this {
    const proxy: this = new Proxy(this, {
      get(target, name: string) {
        return (
          arg1?: object | XMLBuilderPrimitiveType | XMLBuilderFnType,
          arg2?: object | XMLBuilderFnType
        ) => {
          let additionalXMLElementParams: [
            undefined | object,
            undefined | XMLBuilderPrimitiveType
          ]
          let fn: undefined | XMLBuilderFnType

          switch (typeof arg1) {
            case 'object':
              additionalXMLElementParams = [arg1, undefined]

              if (!(arg2 instanceof Function || arg2 === undefined))
                throw new Error('Invalid type for arg2')

              fn = arg2
              break
            case 'function':
              additionalXMLElementParams = [undefined, undefined]

              fn = arg1 as XMLBuilderFnType
              break
            default: // arg1 is probably a primitive value.
              if (arg2 instanceof Function)
                throw new Error('Invalid type for arg2')

              additionalXMLElementParams = [arg2, arg1]

              fn = undefined
          }

          const newElement = new XMLElement(name, ...additionalXMLElementParams)

          target.elements.push([target.currentDepth, newElement])

          target.rootElement = target.rootElement || newElement

          if (!fn) return

          target.processChildrenElements(() => {
            const previousElements = [...target.elements]
            const result = fn?.(proxy)

            // Any new elements added?
            if (target.elements.length > previousElements.length) {
              const isSameItem = (
                [depthA, elementA]: [number, XMLElement],
                [depthB, elementB]: [number, XMLElement]
              ) => depthA === depthB && elementA === elementB

              const addedElements = arraysDiff(
                target.elements,
                previousElements,
                isSameItem
              )
                .filter(([depth, _]) => depth === target.currentDepth)
                .map(([_, element]) => element)

              newElement.children = addedElements
            } else {
              if (result === undefined) throw new Error('result is undefined')

              // Assume the block returned a primitive value (number, string etc) instead.
              newElement.children = result
            }
          })
        }
      },
    })

    return proxy
  }

  processChildrenElements(fn: () => void): void {
    this.currentDepth++
    fn()
    this.currentDepth--
  }
}

const INDENTATION_SPACING = 2

class XMLElement {
  constructor(
    public name: string,
    public attrs?: object,
    public children?: XMLBuilderPrimitiveType | XMLElement[]
  ) {}

  str(depth: number = 0): string {
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

  indentation(depth: number): string {
    return ' '.repeat(INDENTATION_SPACING * depth)
  }

  openingTag(selfClosing: boolean = false): string {
    const attrsAsString =
      this.attrs !== undefined ? ' ' + this.attrsAsKeyValuePairsString() : ''

    return `<${this.name}${attrsAsString}${selfClosing ? ' /' : ''}>`
  }

  closingTag(): string {
    return `</${this.name}>`
  }

  attrsAsKeyValuePairsString(): string {
    return Object.entries(this.attrs!)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
  }
}

///////////////////////
// Utility functions //
///////////////////////

const arraysDiff = <T>(
  left: T[],
  right: T[],
  comparisonFn: (left: T, right: T) => boolean
) =>
  left.filter(
    leftItem => !right.find(rightItem => comparisonFn(leftItem, rightItem))
  )

function times(count: number, fn: Function): number | number[] {
  const result: number[] = []

  for (let i = 0; i < count; i++) {
    if (fn === undefined) {
      result.push(i)
    } else {
      fn(i)
    }
  }

  return fn === undefined ? result : count
}

function rand(limit: number): number {
  return Math.trunc(Math.random() * limit)
}

const builder: SimpleXMLBuilder = new SimpleXMLBuilder(xml => {
  // @ts-ignore
  xml.document({ type: 'xml', use: 'example' }, () => {
    // @ts-ignore
    xml.description('This is an example of using SimpleXMLBuilder2.')
    // @ts-ignore
    xml.next_meeting({ date: new Date() }, () => {
      // @ts-ignore
      xml.agenda('Nothing of importance will be decided.')
      // @ts-ignore
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
  // @ts-ignore
  xml.html({ lang: 'en-US' }, () => {
    // @ts-ignore
    xml.head(() => {
      // @ts-ignore
      xml.title('Just a moment...')
      // @ts-ignore
      xml.link('Some link', {
        href: '/cdn-cgi/styles/challenges.css',
        rel: 'stylesheet',
      })
    })
    // @ts-ignore
    xml.body({ class: 'no-js' }, () => {
      // @ts-ignore
      xml.div({ class: 'main-wrapper', role: 'main' }, () => 'Some div')
      // @ts-ignore
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
  // @ts-ignore
  xml.report(() => {
    // @ts-ignore
    xml.name(() => 'Annual Report')
    times(12, (i: number) => {
      // @ts-ignore
      xml.amounts({ month: i + 1 }, () => {
        // @ts-ignore
        xml.expenses(rand(1000))
        // @ts-ignore
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
