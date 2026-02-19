from graph.workflow_graph import build_graph


def run_pipeline(repo_path: str):
    app = build_graph()
    return app.invoke({"repo_path": repo_path})


if __name__ == '__main__':
    result = run_pipeline('./workspace')
    print(result)
