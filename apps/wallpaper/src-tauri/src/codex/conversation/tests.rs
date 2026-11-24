use super::*;

#[test]
fn cancellation_is_scoped_to_its_window_and_handles_early_cancel() {
    let requests = Requests::default();
    let first = ("first".into(), "id".into());
    let second = ("second".into(), "id".into());
    let mut cancelled = requests.begin(&first).unwrap();
    let mut retained = requests.begin(&second).unwrap();
    requests.cancel(first);
    assert!(matches!(
        cancelled.try_recv(),
        Err(oneshot::error::TryRecvError::Closed)
    ));
    assert!(matches!(
        retained.try_recv(),
        Err(oneshot::error::TryRecvError::Empty)
    ));
    let early = ("early".into(), "id".into());
    requests.cancel(early.clone());
    assert!(matches!(requests.begin(&early), Err(Error::Cancelled)));
}

#[test]
fn validates_bounded_user_dialogue() {
    let mut request = Request {
        id: uuid::Uuid::new_v4().to_string(),
        model: None,
        messages: vec![Message {
            role: Role::User,
            content: "hello".into(),
        }],
    };
    assert!(validate(&request).is_ok());
    request.messages[0].role = Role::Assistant;
    assert!(validate(&request).is_err());
    request.messages.clear();
    assert!(validate(&request).is_err());
}

#[test]
#[ignore = "Sends one short test request using the existing Codex login"]
fn generates_a_reply_using_the_available_codex_model() {
    let answer = tauri::async_runtime::block_on(async {
        let model = {
            let mut client = Client::connect().await.unwrap();
            models(&mut client)
                .await
                .unwrap()
                .into_iter()
                .find(|model| model.default)
                .map(|model| model.id)
        };
        let request = Request {
            id: uuid::Uuid::new_v4().to_string(),
            model,
            messages: vec![
                Message {
                    role: Role::User,
                    content: "기억할 단어는 노란우산이야.".into(),
                },
                Message {
                    role: Role::Assistant,
                    content: "노란우산을 기억할게.".into(),
                },
                Message {
                    role: Role::User,
                    content: "기억한 단어만 말해 줘.".into(),
                },
            ],
        };
        tokio::time::timeout(Duration::from_secs(90), generation::generate(&request))
            .await
            .unwrap()
            .unwrap()
    });
    assert!(answer.contains("노란우산"));
    println!("Codex conversation reply: {answer}");
}
