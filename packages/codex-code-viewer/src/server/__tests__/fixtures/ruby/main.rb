require_relative 'lib/reports/report'
require_relative 'lib/helpers'
require 'reports/report'

report = Reports::Report.new("한글 🦊")
report.render!
Helpers.greet("미리보기")
