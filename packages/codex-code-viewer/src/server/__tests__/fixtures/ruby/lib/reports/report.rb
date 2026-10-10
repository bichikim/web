module Reports
  class Report
    def initialize(title)
      @title = title
    end

    def render!
      @title
    end
  end
end
