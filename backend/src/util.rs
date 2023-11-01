use std::fmt::format;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn generate_id_from_time() -> String{
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap().as_nanos();
    let id = format!("{:X}", nanos);
    id.chars().rev().collect()
}


#[cfg(test)]
mod test {
    use std::process::id;
    use crate::util::generate_id;

    #[test]
    fn test_generate_id() {
        let id1 = generate_id();
        let id2 = generate_id();
        println!("id1:{}, id2:{}", id1, id2);
        assert_ne!(id1, id2);
    }
}