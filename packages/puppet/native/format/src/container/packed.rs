//! Typed numerical deserialization using sections of the file buffer.
use serde::de::{self, DeserializeSeed, Deserializer, IntoDeserializer, Visitor};
use serde_json::{Error, Value};

pub(crate) const MARKER: &str = "\0poffo-runtime-numbers";

#[derive(Clone, Copy)]
pub struct Array {
    pub tag: u8,
    pub width: usize,
    pub start: usize,
    pub length: usize,
}

pub struct Data {
    pub value: Value,
    pub bytes: Vec<u8>,
    pub arrays: Vec<Array>,
}

impl Data {
    pub fn document(self, value: Value) -> Result<crate::Document, Error> {
        serde::Deserialize::deserialize(Node {
            value,
            bytes: &self.bytes,
            arrays: &self.arrays,
        })
    }
}

struct Node<'de> {
    value: Value,
    bytes: &'de [u8],
    arrays: &'de [Array],
}

impl<'de> IntoDeserializer<'de, Error> for Node<'de> {
    type Deserializer = Self;

    fn into_deserializer(self) -> Self {
        self
    }
}

impl<'de> Deserializer<'de> for Node<'de> {
    type Error = Error;

    fn deserialize_any<V: Visitor<'de>>(self, visitor: V) -> Result<V::Value, Error> {
        let Self {
            value,
            bytes,
            arrays,
        } = self;
        match value {
            Value::Array(list) => visitor.visit_seq(de::value::SeqDeserializer::new(
                list.into_iter().map(|value| Node {
                    value,
                    bytes,
                    arrays,
                }),
            )),
            Value::Object(mut object) => {
                if object.len() == 1
                    && let Some(index) = object.remove(MARKER)
                {
                    let item = arrays[index.as_u64().unwrap() as usize];
                    return visitor.visit_seq(Numbers {
                        tag: item.tag,
                        values: bytes[item.start..item.start + item.length]
                            .chunks_exact(item.width),
                    });
                }
                visitor.visit_map(de::value::MapDeserializer::new(object.into_iter().map(
                    |(key, value)| {
                        (
                            key,
                            Node {
                                value,
                                bytes,
                                arrays,
                            },
                        )
                    },
                )))
            }
            other => other.deserialize_any(visitor),
        }
    }

    fn deserialize_option<V: Visitor<'de>>(self, visitor: V) -> Result<V::Value, Error> {
        if self.value.is_null() {
            visitor.visit_none()
        } else {
            visitor.visit_some(self)
        }
    }

    fn deserialize_newtype_struct<V: Visitor<'de>>(
        self,
        _name: &'static str,
        visitor: V,
    ) -> Result<V::Value, Error> {
        visitor.visit_newtype_struct(self)
    }

    fn deserialize_enum<V: Visitor<'de>>(
        self,
        name: &'static str,
        variants: &'static [&'static str],
        visitor: V,
    ) -> Result<V::Value, Error> {
        self.value.deserialize_enum(name, variants, visitor)
    }

    serde::forward_to_deserialize_any! {
        bool i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 f32 f64 char str string bytes byte_buf
        unit unit_struct seq tuple tuple_struct map struct identifier ignored_any
    }
}

struct Numbers<'de> {
    tag: u8,
    values: std::slice::ChunksExact<'de, u8>,
}
impl<'de> de::SeqAccess<'de> for Numbers<'de> {
    type Error = Error;

    fn next_element_seed<T: DeserializeSeed<'de>>(
        &mut self,
        seed: T,
    ) -> Result<Option<T::Value>, Error> {
        let Some(bytes) = self.values.next() else {
            return Ok(None);
        };
        use super::value::tag;
        let result =
            match self.tag {
                tag::UINT8 => seed.deserialize(bytes[0].into_deserializer()),
                tag::UINT16 => seed
                    .deserialize(u16::from_le_bytes(bytes.try_into().unwrap()).into_deserializer()),
                tag::UINT32 => seed
                    .deserialize(u32::from_le_bytes(bytes.try_into().unwrap()).into_deserializer()),
                tag::INT32 => seed
                    .deserialize(i32::from_le_bytes(bytes.try_into().unwrap()).into_deserializer()),
                tag::FLOAT32 | tag::FLOAT64 => {
                    let value = if self.tag == tag::FLOAT32 {
                        f64::from(f32::from_le_bytes(bytes.try_into().unwrap()))
                    } else {
                        f64::from_le_bytes(bytes.try_into().unwrap())
                    };
                    if !value.is_finite() {
                        return Err(de::Error::custom("non-finite runtime coordinate"));
                    }
                    seed.deserialize(if value == 0. { 0. } else { value }.into_deserializer())
                }
                _ => unreachable!("numeric tag was checked while reading the file"),
            };
        result.map(Some)
    }

    fn size_hint(&self) -> Option<usize> {
        Some(self.values.len())
    }
}
