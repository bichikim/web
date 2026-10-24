#!/usr/bin/env python3
"""Keep one offline Laya Core ML model loaded and serve JSON Lines decisions."""

import argparse
import json
import sys

import laya_coreml as laya


def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument(
        "--compute-units", choices=["all", "cpu", "cpu_gpu", "cpu_ne"]
    )
    parser.add_argument("--allow-download", action="store_true")
    return parser.parse_args()


def write_message(message):
    print(json.dumps(message, ensure_ascii=False), flush=True)


def main():
    arguments = parse_arguments()
    load_options = {
        "revision": arguments.revision,
        "local_files_only": not arguments.allow_download,
    }
    if arguments.compute_units is not None:
        load_options["compute_units"] = arguments.compute_units
    agent = laya.load(arguments.model, **load_options)
    write_message({"type": "ready"})
    for serialized in sys.stdin:
        if not serialized.strip():
            continue
        request = json.loads(serialized)
        try:
            result = agent.predict(request["state"], request["questions"])
            write_message(
                {
                    "type": "result",
                    "id": request["id"],
                    "answers": result["answers"],
                }
            )
        except Exception as error:
            write_message(
                {"type": "result", "id": request.get("id", -1), "error": str(error)}
            )


if __name__ == "__main__":
    main()
