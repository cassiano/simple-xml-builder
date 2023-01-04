# Hit CTRL+ALT+N to run inside VS Code.

# Try it on the browser:
# https://try.ruby-lang.org/playground/#code=class+Cursor%0A++attr_reader+%3Aposition%0A++def+initialize%3B+%40position+%3D+%5B0%2C+0%5D%3B+end%0A++def+move(%26block)%3B+instance_exec+%26block%3B+end%0A++def+up(steps+%3D+1)%3B+position%5B0%5D+%2B%3D+steps%3B+end%0A++def+down(steps+%3D+1)%3B+position%5B0%5D+-%3D+steps%3B+end%0A++def+right(steps+%3D+1)%3B+position%5B1%5D+%2B%3D+steps%3B+end%0A++def+left(steps+%3D+1)%3B+position%5B1%5D+-%3D+steps%3B+end%0Aend%0A%0Acursor+%3D+Cursor.new%0A%0Acursor.move+do%0A++up%0A++down+2%0A++left+3%0A++right+4%0Aend%0A%0A%23+Should+display+%5B-1%2C+1%5D.%0Ap+cursor.position%0A&engine=opal

# class Cursor
#   attr_reader :position
#   def initialize; @position = [0, 0]; end
#   def move(&block); instance_exec &block; end
#   def up(steps = 1); position[0] += steps; end
#   def down(steps = 1); position[0] -= steps; end
#   def right(steps = 1); position[1] += steps; end
#   def left(steps = 1); position[1] -= steps; end
# end

# cursor = Cursor.new

# cursor.move do
#   up
#   down 2
#   left 3
#   right 4
# end

# # Should display [-1, 1]
# p cursor.position

class Array
  private

  def method_missing(name, *args, &block)
    if all? { |item| item.respond_to? name }
      map { |item| item.send name, *args, &block }
    elsif any? { |item| item.respond_to? name }
      raise "Sorry, but all items need to respond to method `#{name}` to allow it to be called over the whole collection"
    else
      super
    end
  end
end

class SimpleXMLBuilder
  attr_reader :root_element
  private attr_reader :current_depth, :elements

  # Undefine most inherited instance methods (e.g. dup, to_s, then, display, taint, class, clone
  # etc), in order to allow them to be used as XML tag names.
  (instance_methods - instance_methods(false))
    .filter do |method|
      # Exclude a few selected methods, ones that start and end with `__` or which contain at
      # least one non-word character (e.g. ?, ! etc).
      !(
        %i[object_id instance_exec].include?(method) || # Remember to add :rand when running in Opal.
          method.to_s =~ /^__\w+__$/ || method.to_s =~ /\W/
      )
    end
    .each { |method| undef_method method }

  def initialize(&block)
    build(&block) if block
  end

  def build(&block)
    reset
    instance_exec &block
  end

  def str
    root_element.str
  end

  private

  def reset
    @elements = []
    @current_depth = 0
  end

  def method_missing(name, *args, &block)
    additional_params =
      args[0].is_a?(Hash) ? [args[0], nil] : [args[1], args[0]]

    new_element = XMLElement.new(name, *additional_params)

    @root_element ||= new_element
    elements << [current_depth, new_element]

    return unless block

    process_children_elements do
      previous_elements = elements.clone

      result = block.call

      # Any new elements added?
      if elements.size > previous_elements.size
        added_elements =
          (elements - previous_elements).filter_map do |(depth, element)|
            element if depth == current_depth
          end

        new_element.children = added_elements
      else
        # Assume the block returned an scalar value (number, string etc) instead.
        new_element.children = result
      end
    end
  end

  def process_children_elements(&block)
    @current_depth += 1
    block.call
    @current_depth -= 1
  end
end

class XMLElement
  INDENTATION_SPACING = 2

  attr_reader :name, :attrs
  attr_accessor :children

  def initialize(name, attrs = {}, children = [])
    @name = name
    @attrs = attrs
    @children = children
  end

  def str(depth = 0)
    if children
      children_as_string =
        if children.is_a?(Array)
          children.str(depth + 1).join("\n")
        else
          [indentation(depth + 1), children].join
        end

      [
        indentation(depth) + opening_tag(attrs),
        children_as_string,
        indentation(depth) + closing_tag,
      ].join("\n")
    else
      indentation(depth) + opening_tag(attrs, self_closing: true)
    end
  end

  private

  def indentation(depth)
    ' ' * INDENTATION_SPACING * depth
  end

  def opening_tag(attrs, self_closing: false)
    attrs_as_string = attrs ? ' ' + attrs_as_key_value_pairs_string : ''

    ['<', name, attrs_as_string, self_closing ? ' /' : '', '>'].join
  end

  def closing_tag
    ['</', name, '>'].join
  end

  def attrs_as_key_value_pairs_string
    attrs.map { |(k, v)| %Q(#{k}="#{v}") }.join(' ')
  end
end

xml =
  SimpleXMLBuilder.new do
    document type: 'xml', use: 'example' do
      description 'This is an example of using SimpleXMLBuilder2.'
      next_meeting date: Time.now + 100_000 do
        agenda 'Nothing of importance will be decided.'
        clearance level: 'classified'
      end
    end
  end

puts xml.str

# Produces:
#
# <document type="xml" use="example">
#   <description>
#     This is an example of using SimpleXMLBuilder.
#   </description>
#   <next_meeting date="2022-12-28 07:47:15 -0300">
#     <agenda>
#       Nothing of importance will be decided.
#     </agenda>
#     <clearance level="classified" />
#   </next_meeting>
# </document>

xml =
  SimpleXMLBuilder.new do
    html lang: 'en-US' do
      head do
        title 'Just a moment...'
        link href: '/cdn-cgi/styles/challenges.css', rel: 'stylesheet'
      end
      body class: 'no-js' do
        div class: 'main-wrapper', role: 'main'
        div class: 'main-content' do
          h1 class: 'zone-name-title h1' do
            img class: 'heading-favicon', src: '/favicon.ico'
          end
          h2 class: 'h2', id: 'challenge-running' do
            'Checking if the site connection is secure'
          end
          noscript do
            div id: 'challenge-error-title' do
              div class: 'h2' do
                span class: 'icon-wrapper' do
                  div class: 'heading-icon warning-icon'
                  span 'Enable JavaScript and cookies to continue',
                       id: 'challenge-error-text'
                end
              end
            end
          end
        end
      end
    end
  end

puts
puts xml.str

# Produces:
#
# <html lang="en-US">
#   <head>
#     <title>
#       Just a moment...
#     </title>
#     <link href="/cdn-cgi/styles/challenges.css" rel="stylesheet" />
#   </head>
#   <body class="no-js">
#     <div class="main-wrapper" role="main" />
#     <div class="main-content">
#       <h1 class="zone-name-title h1">
#         <img class="heading-favicon" src="/favicon.ico" />
#       </h1>
#       <h2 class="h2" id="challenge-running">
#         Checking if the site connection is secure
#       </h2>
#       <noscript>
#         <div id="challenge-error-title">
#           <div class="h2">
#             <span class="icon-wrapper">
#               <div class="heading-icon warning-icon" />
#               <span id="challenge-error-text">
#                 Enable JavaScript and cookies to continue
#               </span>
#             </span>
#           </div>
#         </div>
#       </noscript>
#     </div>
#   </body>
# </html>

xml = SimpleXMLBuilder.new

xml.build do
  report do
    name 'Annual Report'
    xml.class 'Class of 94' # Notice the explicit use of the `xml` receiver, since `class` is a reserved word.
    12.times do |i|
      amounts month: i + 1 do
        expenses rand(1000)
        revenue { rand(1000) }
      end
    end
  end
end

puts
puts xml.str

# Produces:
#
# <report>
#   <name>
#     Annual report
#   </name>
#   <month index="1">
#     <expenses>
#       812
#     </expenses>
#     <revenue>
#       259
#     </revenue>
#   </month>
#   <month index="2">
#     <expenses>
#       898
#     </expenses>
#     <revenue>
#       534
#     </revenue>
#   </month>
#   <month index="3">
#     <expenses>
#       479
#     </expenses>
#     <revenue>
#       844
#     </revenue>
#   </month>
#   <month index="4">
#     <expenses>
#       870
#     </expenses>
#     <revenue>
#       575
#     </revenue>
#   </month>
#   <month index="5">
#     <expenses>
#       239
#     </expenses>
#     <revenue>
#       472
#     </revenue>
#   </month>
#   <month index="6">
#     <expenses>
#       457
#     </expenses>
#     <revenue>
#       669
#     </revenue>
#   </month>
#   <month index="7">
#     <expenses>
#       387
#     </expenses>
#     <revenue>
#       425
#     </revenue>
#   </month>
#   <month index="8">
#     <expenses>
#       986
#     </expenses>
#     <revenue>
#       866
#     </revenue>
#   </month>
#   <month index="9">
#     <expenses>
#       975
#     </expenses>
#     <revenue>
#       701
#     </revenue>
#   </month>
#   <month index="10">
#     <expenses>
#       245
#     </expenses>
#     <revenue>
#       87
#     </revenue>
#   </month>
#   <month index="11">
#     <expenses>
#       785
#     </expenses>
#     <revenue>
#       135
#     </revenue>
#   </month>
#   <month index="12">
#     <expenses>
#       218
#     </expenses>
#     <revenue>
#       6
#     </revenue>
#   </month>
# </report>
