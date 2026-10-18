class Report:
    def __init__(self, title: str):
        self.title = title

    def render(self) -> str:
        return self.title
